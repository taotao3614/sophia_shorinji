/**
 * 投票管理システム - Google Apps Script バックエンド
 *
 * 機能:
 * - 新規投票の作成（Google Form自動生成 + 応答対象者管理）
 * - 投票リストの取得（回答進捗付き）
 * - 投票詳細の取得（回答済み/未回答者の比較）
 * - Flex Message生成
 * - 締切日チェックと提醒
 *
 * 使用方法:
 * 1. Google Sheetsで新しいスプレッドシートを作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードをコピー＆ペースト
 * 4. MASTER_SHEET_ID を実際のシートIDに置き換え
 * 5. デプロイ > 新しいデプロイ > ウェブアプリ として実行
 * 6. アクセス権限: 全員（匿名含む）
 * 7. デプロイされたURL（Web App URL）をconfig.jsonに設定
 */

// ===== 設定 =====
// TODO: Google SheetsのIDをここに設定してください
const MASTER_SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const MASTER_SHEET_NAME = '投票管理';

/**
 * Web AppのPOSTリクエスト処理
 */
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;

    Logger.log('受信アクション: ' + action);
    Logger.log('パラメータ: ' + JSON.stringify(params));

    let result;

    switch(action) {
      case 'createVote':
        result = createVote(params);
        break;
      case 'listVotes':
        result = listVotes(params);
        break;
      case 'getVoteDetail':
        result = getVoteDetail(params);
        break;
      case 'checkDeadlines':
        result = checkDeadlines();
        break;
      default:
        result = {
          success: false,
          error: '不明なアクション: ' + action
        };
    }

    return createJsonResponse(result);

  } catch (error) {
    Logger.log('エラー: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * GETリクエスト処理（テスト用）
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: '投票管理システムAPI - POST /exec を使用してください',
    timestamp: new Date().toISOString(),
    version: '2.0'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * JSON レスポンスを作成
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * マスターシートを取得
 */
function getMasterSheet() {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  let sheet = ss.getSheetByName(MASTER_SHEET_NAME);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(MASTER_SHEET_NAME);
    // ヘッダー行を設定（拡張版）
    sheet.getRange(1, 1, 1, 11).setValues([[
      '投票ID',           // A列
      '投票タイトル',     // B列
      '投票説明',         // C列
      '作成日時',         // D列
      '締切日時',         // E列
      'Google Form URL', // F列
      'Form ID',         // G列
      'ステータス',       // H列
      '応答対象者',       // I列
      '3日前提醒送信済', // J列
      '1日前提醒送信済'  // K列
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // 列幅を調整
    sheet.setColumnWidth(1, 180);  // 投票ID
    sheet.setColumnWidth(2, 200);  // タイトル
    sheet.setColumnWidth(3, 200);  // 説明
    sheet.setColumnWidth(6, 300);  // Form URL
    sheet.setColumnWidth(9, 300);  // 応答対象者
  }

  return sheet;
}

/**
 * 新規投票を作成
 */
function createVote(params) {
  try {
    const { title, description, options, deadline, targetMembers } = params;

    // バリデーション
    if (!title || !options || !Array.isArray(options) || options.length === 0) {
      return {
        success: false,
        error: 'タイトルと選択肢が必要です'
      };
    }

    // Google Formを作成
    Logger.log('Google Form作成開始: ' + title);
    const form = FormApp.create(title);

    // フォームの説明を設定
    let formDescription = description || '';
    if (deadline) {
      formDescription += '\n\n【締切】' + deadline;
    }
    if (formDescription) {
      form.setDescription(formDescription);
    }

    // 【重要】姓名フィールドを最初に追加（必須）
    form.addTextItem()
      .setTitle('お名前（必須）')
      .setHelpText('※正確な名前を入力してください')
      .setRequired(true);

    // 選択肢の質問を追加
    const checkboxItem = form.addCheckboxItem();
    checkboxItem.setTitle('選択してください（複数選択可）');
    checkboxItem.setChoiceValues(options);
    checkboxItem.setRequired(true);

    // フォーム設定
    form.setCollectEmail(false);  // メールアドレス収集しない
    form.setLimitOneResponsePerUser(false);  // 重複回答を許可
    form.setShowLinkToRespondAgain(false);

    // フォームURLとIDを取得
    const formUrl = form.getPublishedUrl();
    const formId = form.getId();

    Logger.log('Google Form作成完了: ' + formUrl);

    // マスターシートに記録
    const sheet = getMasterSheet();
    const voteId = generateVoteId();
    const createdAt = new Date().toISOString();
    const status = 'active';

    // 応答対象者をカンマ区切りの文字列に変換
    const targetMembersStr = Array.isArray(targetMembers)
      ? targetMembers.join(',')
      : (targetMembers || '');

    sheet.appendRow([
      voteId,
      title,
      description || '',
      createdAt,
      deadline || '',
      formUrl,
      formId,
      status,
      targetMembersStr,
      false,  // 3日前提醒未送信
      false   // 1日前提醒未送信
    ]);

    Logger.log('マスターシートに記録完了: ' + voteId);

    // Flex Messageを生成
    const flexMessage = generateFlexMessage({
      voteId: voteId,
      title: title,
      description: description,
      deadline: deadline,
      formUrl: formUrl
    });

    return {
      success: true,
      voteId: voteId,
      formUrl: formUrl,
      formId: formId,
      flexMessage: flexMessage,
      message: '投票を作成しました'
    };

  } catch (error) {
    Logger.log('createVoteエラー: ' + error.toString());
    return {
      success: false,
      error: '投票の作成に失敗しました: ' + error.toString()
    };
  }
}

/**
 * 投票リストを取得（回答進捗付き）
 */
function listVotes(params) {
  try {
    const sheet = getMasterSheet();
    const data = sheet.getDataRange().getValues();

    const votes = [];
    const now = new Date();

    // ヘッダー行をスキップ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // 空行をスキップ
      if (!row[0]) continue;

      const voteId = row[0];
      const title = row[1];
      const description = row[2];
      const createdAt = row[3];
      const deadline = row[4];
      const formUrl = row[5];
      const formId = row[6];
      let status = row[7];
      const targetMembersStr = row[8] || '';

      // 締切をチェックしてステータスを更新
      let daysLeft = null;
      if (deadline && status === 'active') {
        const deadlineDate = new Date(deadline);
        daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          status = 'expired';
          // シートのステータスも更新
          sheet.getRange(i + 1, 8).setValue('expired');
        }
      }

      // 回答進捗を取得
      const stats = getResponseStatsQuick(formId, targetMembersStr);

      votes.push({
        voteId,
        title,
        description,
        createdAt,
        deadline,
        formUrl,
        formId,
        status,
        daysLeft: daysLeft,
        stats: stats  // { total, responded, notRespondedCount }
      });
    }

    // 新しい順に並べ替え
    votes.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return {
      success: true,
      votes: votes,
      count: votes.length
    };

  } catch (error) {
    Logger.log('listVotesエラー: ' + error.toString());
    return {
      success: false,
      error: '投票リストの取得に失敗しました: ' + error.toString()
    };
  }
}

/**
 * 投票詳細を取得（回答者と未回答者の詳細）
 */
function getVoteDetail(params) {
  try {
    const { voteId } = params;

    if (!voteId) {
      return {
        success: false,
        error: '投票IDが必要です'
      };
    }

    const sheet = getMasterSheet();
    const data = sheet.getDataRange().getValues();

    // 投票を検索
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === voteId) {
        const row = data[i];

        const voteData = {
          voteId: row[0],
          title: row[1],
          description: row[2],
          createdAt: row[3],
          deadline: row[4],
          formUrl: row[5],
          formId: row[6],
          status: row[7],
          targetMembersStr: row[8] || ''
        };

        // 回答データを詳細に取得
        const responseData = getResponseDetails(
          voteData.formId,
          voteData.targetMembersStr
        );

        // 締切までの日数を計算
        let daysLeft = null;
        if (voteData.deadline) {
          const now = new Date();
          const deadlineDate = new Date(voteData.deadline);
          daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
        }

        return {
          success: true,
          vote: {
            voteId: voteData.voteId,
            title: voteData.title,
            description: voteData.description,
            createdAt: voteData.createdAt,
            deadline: voteData.deadline,
            formUrl: voteData.formUrl,
            status: voteData.status,
            daysLeft: daysLeft
          },
          stats: {
            total: responseData.targetMembers.length,
            respondedCount: responseData.respondedMembers.length,
            notRespondedCount: responseData.notRespondedMembers.length
          },
          respondedMembers: responseData.respondedMembers,
          notRespondedMembers: responseData.notRespondedMembers
        };
      }
    }

    return {
      success: false,
      error: '投票が見つかりません'
    };

  } catch (error) {
    Logger.log('getVoteDetailエラー: ' + error.toString());
    return {
      success: false,
      error: '投票詳細の取得に失敗しました: ' + error.toString()
    };
  }
}

/**
 * 回答進捗を簡易取得（リスト表示用）
 */
function getResponseStatsQuick(formId, targetMembersStr) {
  try {
    if (!formId || !targetMembersStr) {
      return { total: 0, responded: 0, notRespondedCount: 0 };
    }

    const form = FormApp.openById(formId);
    const responses = form.getResponses();

    const targetMembers = targetMembersStr.split(',').map(s => s.trim()).filter(s => s);
    const respondedCount = responses.length;

    return {
      total: targetMembers.length,
      responded: respondedCount,
      notRespondedCount: Math.max(0, targetMembers.length - respondedCount)
    };

  } catch (error) {
    Logger.log('getResponseStatsQuickエラー: ' + error.toString());
    return { total: 0, responded: 0, notRespondedCount: 0 };
  }
}

/**
 * 回答詳細を取得（名前ベースの比較）
 */
function getResponseDetails(formId, targetMembersStr) {
  try {
    // 応答対象者リストを配列に変換
    const targetMembers = targetMembersStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    if (targetMembers.length === 0) {
      return {
        targetMembers: [],
        respondedMembers: [],
        notRespondedMembers: []
      };
    }

    // Formの回答を取得
    const form = FormApp.openById(formId);
    const responses = form.getResponses();

    // 回答者の名前を抽出（最初の質問が名前）
    const respondedMembers = [];
    responses.forEach(response => {
      const itemResponses = response.getItemResponses();
      if (itemResponses.length > 0) {
        const name = itemResponses[0].getResponse().trim();
        if (name) {
          respondedMembers.push(name);
        }
      }
    });

    // 未回答者を計算
    const notRespondedMembers = targetMembers.filter(
      name => !respondedMembers.includes(name)
    );

    return {
      targetMembers: targetMembers,
      respondedMembers: respondedMembers,
      notRespondedMembers: notRespondedMembers
    };

  } catch (error) {
    Logger.log('getResponseDetailsエラー: ' + error.toString());
    return {
      targetMembers: [],
      respondedMembers: [],
      notRespondedMembers: []
    };
  }
}

/**
 * Flex Messageを生成
 */
function generateFlexMessage(vote) {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "📋 新しい投票",
          weight: "bold",
          color: "#b8282d",
          size: "sm"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: vote.title,
          weight: "bold",
          size: "xl",
          wrap: true
        },
        {
          type: "text",
          text: vote.description || " ",
          size: "sm",
          color: "#666666",
          wrap: true,
          margin: "md"
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          contents: vote.deadline ? [
            {
              type: "text",
              text: "📅 締切：" + vote.deadline,
              size: "sm",
              color: "#b8282d"
            }
          ] : []
        }
      ]
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "投票する",
            uri: vote.formUrl
          },
          style: "primary",
          color: "#b8282d"
        }
      ]
    }
  };
}

/**
 * 締切日をチェックして提醒（定時実行用）
 */
function checkDeadlines() {
  try {
    const sheet = getMasterSheet();
    const data = sheet.getDataRange().getValues();
    const now = new Date();

    let checkedCount = 0;
    let expiredCount = 0;

    // ヘッダー行をスキップ
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!row[0]) continue;  // 空行スキップ

      const status = row[7];
      const deadline = row[4];

      // active状態で締切がある投票のみ
      if (status !== 'active' || !deadline) continue;

      const deadlineDate = new Date(deadline);
      const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

      checkedCount++;

      // 過期: ステータスを更新
      if (daysLeft < 0) {
        sheet.getRange(i + 1, 8).setValue('expired');
        expiredCount++;
      }

      // TODO: 3日前、1日前の提醒ロジックをここに実装
      // 現在は手動提醒を推奨
    }

    return {
      success: true,
      checkedCount: checkedCount,
      expiredCount: expiredCount,
      message: `${checkedCount}件の投票をチェック、${expiredCount}件を期限切れに更新しました`
    };

  } catch (error) {
    Logger.log('checkDeadlinesエラー: ' + error.toString());
    return {
      success: false,
      error: '締切チェックに失敗しました: ' + error.toString()
    };
  }
}

/**
 * 投票IDを生成（タイムスタンプベース）
 */
function generateVoteId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return 'VOTE_' + timestamp + '_' + random;
}

/**
 * 定時トリガーを設定（毎日実行）
 */
function setupDailyTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'checkDeadlines') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 新しいトリガーを作成（毎日朝9時）
  ScriptApp.newTrigger('checkDeadlines')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log('定時トリガーを設定しました（毎日9:00）');
}

/**
 * テスト関数 - Apps Scriptエディタから直接実行可能
 */
function testCreateVote() {
  const result = createVote({
    title: 'テスト投票',
    description: 'これはテスト投票です',
    options: ['選択肢1', '選択肢2', '選択肢3'],
    deadline: '2025-12-31',
    targetMembers: ['張三', '李四', '王五', '趙六']
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testListVotes() {
  const result = listVotes({});
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetVoteDetail() {
  // 実際の投票IDに置き換えてテスト
  const result = getVoteDetail({
    voteId: 'VOTE_1234567890_123'
  });
  Logger.log(JSON.stringify(result, null, 2));
}

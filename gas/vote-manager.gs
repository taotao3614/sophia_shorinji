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
const MASTER_SHEET_ID = '1u_lVjF8hGIACG3b7STwHQE_wYHwNGKXK9i3fmUvFf74';  // あなたのスプレッドシートID
const MASTER_SHEET_NAME = '投票管理';
const CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';  // LINE Channel Access Token（提醒機能用）

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
    // ヘッダー行を設定（回答表URLを追加）
    sheet.getRange(1, 1, 1, 10).setValues([[
      'Google Form URL',    // A列 - 主キー
      'Form ID',            // B列
      'Response Sheet URL', // C列 - 回答表のURL
      '投票タイトル',        // D列
      '投票説明',            // E列
      '作成日時',            // F列
      '締切日時',            // G列
      'ステータス',          // H列
      '応答対象者',          // I列
      '提醒送信済'           // J列
    ]]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // 列幅を調整
    sheet.setColumnWidth(1, 350);  // Form URL
    sheet.setColumnWidth(3, 200);  // タイトル
    sheet.setColumnWidth(4, 200);  // 説明
    sheet.setColumnWidth(8, 300);  // 応答対象者
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

    // 回答用のSpreadsheetを作成して関連付け
    const responseSpreadsheet = SpreadsheetApp.create(title + ' (回答)');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSpreadsheet.getId());
    const responseSheetUrl = responseSpreadsheet.getUrl();

    Logger.log('回答用スプレッドシート作成完了: ' + responseSheetUrl);

    // マスターシートに記録
    const sheet = getMasterSheet();
    const createdAt = new Date().toISOString();
    const status = 'active';

    // 応答対象者をカンマ区切りの文字列に変換
    const targetMembersStr = Array.isArray(targetMembers)
      ? targetMembers.join(',')
      : (targetMembers || '');

    sheet.appendRow([
      formUrl,            // A列 - Form URL（主キー）
      formId,             // B列 - Form ID
      responseSheetUrl,   // C列 - 回答表のURL
      title,              // D列 - タイトル
      description || '',  // E列 - 説明
      createdAt,          // F列 - 作成日時
      deadline || '',     // G列 - 締切
      status,             // H列 - ステータス
      targetMembersStr,   // I列 - 応答対象者
      false               // J列 - 提醒送信済
    ]);

    Logger.log('マスターシートに記録完了: ' + formUrl);

    // Flex Messageを生成
    const flexMessage = generateFlexMessage({
      title: title,
      description: description,
      deadline: deadline,
      formUrl: formUrl
    });

    return {
      success: true,
      formUrl: formUrl,
      formId: formId,
      responseSheetUrl: responseSheetUrl,  // 回答表のURLを追加
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

      const formUrl = row[0];        // A列
      const formId = row[1];         // B列
      const responseSheetUrl = row[2];  // C列
      const title = row[3];          // D列
      const description = row[4];    // E列
      const createdAt = row[5];      // F列
      const deadline = row[6];       // G列
      let status = row[7];           // H列
      const targetMembersStr = row[8] || '';  // I列

      // 締切をチェックしてステータスを更新
      let daysLeft = null;
      if (deadline && status === 'active') {
        const deadlineDate = new Date(deadline);
        daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) {
          status = 'expired';
          // シートのステータスも更新（H列）
          sheet.getRange(i + 1, 8).setValue('expired');
        }
      }

      // 回答進捗を取得
      const stats = getResponseStatsQuick(formId, targetMembersStr);

      votes.push({
        formUrl,              // Form URLが主キー
        formId,
        responseSheetUrl,     // 回答表URL
        title,
        description,
        createdAt,
        deadline,
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
    const { formUrl } = params;

    if (!formUrl) {
      return {
        success: false,
        error: 'Form URLが必要です'
      };
    }

    const sheet = getMasterSheet();
    const data = sheet.getDataRange().getValues();

    // 投票を検索（Form URLで検索）
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === formUrl) {
        const row = data[i];

        const voteData = {
          formUrl: row[0],         // A列
          formId: row[1],          // B列
          responseSheetUrl: row[2], // C列
          title: row[3],           // D列
          description: row[4],     // E列
          createdAt: row[5],       // F列
          deadline: row[6],        // G列
          status: row[7],          // H列
          targetMembersStr: row[8] || ''  // I列
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
            formUrl: voteData.formUrl,
            formId: voteData.formId,
            responseSheetUrl: voteData.responseSheetUrl,  // 回答表URL
            title: voteData.title,
            description: voteData.description,
            createdAt: voteData.createdAt,
            deadline: voteData.deadline,
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

      const status = row[7];      // H列
      const deadline = row[6];    // G列

      // active状態で締切がある投票のみ
      if (status !== 'active' || !deadline) continue;

      const deadlineDate = new Date(deadline);
      const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

      checkedCount++;

      // 過期: ステータスを更新（H列）
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

// generateVoteId関数は不要になったので削除

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
 * 【初期化関数】主表を初期化またはリセット
 * Apps Scriptエディタから直接実行してください
 *
 * 使用方法:
 * 1. Apps Script エディタでこの関数を選択
 * 2. 「実行」ボタンをクリック
 * 3. 初回実行時は権限の承認が必要
 *
 * 注意: 既存のデータがある場合は削除されます！
 */
function initializeMasterSheet() {
  try {
    Logger.log('=== 主表初期化開始 ===');

    const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
    let sheet = ss.getSheetByName(MASTER_SHEET_NAME);

    // 既存のシートがある場合は削除
    if (sheet) {
      Logger.log('既存の主表を削除します: ' + MASTER_SHEET_NAME);
      ss.deleteSheet(sheet);
    }

    // 新しいシートを作成
    Logger.log('新しい主表を作成します: ' + MASTER_SHEET_NAME);
    sheet = ss.insertSheet(MASTER_SHEET_NAME);

    // ヘッダー行を設定
    sheet.getRange(1, 1, 1, 10).setValues([[
      'Google Form URL',    // A列 - 主キー
      'Form ID',            // B列
      'Response Sheet URL', // C列 - 回答表のURL
      '投票タイトル',        // D列
      '投票説明',            // E列
      '作成日時',            // F列
      '締切日時',            // G列
      'ステータス',          // H列
      '応答対象者',          // I列
      '提醒送信済'           // J列
    ]]);

    // ヘッダー行のスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, 10);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#b8282d');  // 上智大学の赤色
    headerRange.setFontColor('#ffffff');   // 白文字
    headerRange.setHorizontalAlignment('center');

    // ヘッダー行を固定
    sheet.setFrozenRows(1);

    // 列幅を調整
    sheet.setColumnWidth(1, 400);  // A列: Form URL
    sheet.setColumnWidth(2, 200);  // B列: Form ID
    sheet.setColumnWidth(3, 400);  // C列: Response Sheet URL
    sheet.setColumnWidth(4, 200);  // D列: タイトル
    sheet.setColumnWidth(5, 250);  // E列: 説明
    sheet.setColumnWidth(6, 180);  // F列: 作成日時
    sheet.setColumnWidth(7, 150);  // G列: 締切日時
    sheet.setColumnWidth(8, 100);  // H列: ステータス
    sheet.setColumnWidth(9, 300);  // I列: 応答対象者
    sheet.setColumnWidth(10, 100); // J列: 提醒送信済

    // データ検証を設定（H列：ステータス）
    const statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['active', 'expired'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, 8, 1000, 1).setDataValidation(statusRule);

    // データ検証を設定（J列：提醒送信済）
    const booleanRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['TRUE', 'FALSE'], true)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, 10, 1000, 1).setDataValidation(booleanRule);

    Logger.log('✅ 主表初期化完了！');
    Logger.log('シート名: ' + MASTER_SHEET_NAME);
    Logger.log('URL: ' + ss.getUrl());

    // 成功メッセージをスプレッドシートに表示
    Browser.msgBox(
      '初期化完了',
      '主表「' + MASTER_SHEET_NAME + '」を初期化しました！\\n\\n' +
      'これでLIFFページから投票を作成できます。',
      Browser.Buttons.OK
    );

    return {
      success: true,
      message: '主表を初期化しました',
      sheetUrl: ss.getUrl()
    };

  } catch (error) {
    Logger.log('❌ 初期化エラー: ' + error.toString());
    Browser.msgBox(
      'エラー',
      '主表の初期化に失敗しました:\\n' + error.toString(),
      Browser.Buttons.OK
    );
    return {
      success: false,
      error: error.toString()
    };
  }
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
  // 実際のForm URLに置き換えてテスト
  const result = getVoteDetail({
    formUrl: 'https://forms.gle/xxxxx'
  });
  Logger.log(JSON.stringify(result, null, 2));
}

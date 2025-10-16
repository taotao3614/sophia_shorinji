/**
 * 投票管理システム - Google Apps Script バックエンド
 *
 * 機能:
 * - 新規投票の作成（Google Form自動生成）
 * - 投票リストの取得
 * - 投票詳細の取得
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
      case 'getVoteDetails':
        result = getVoteDetails(params);
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
    timestamp: new Date().toISOString()
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
    // ヘッダー行を設定
    sheet.getRange(1, 1, 1, 8).setValues([[
      '投票ID', '投票タイトル', '投票説明', '作成日時', '締切日時',
      'Google Form URL', 'ステータス', '回答数'
    ]]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * 新規投票を作成
 */
function createVote(params) {
  try {
    const { title, description, options, deadline } = params;

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
    if (description) {
      form.setDescription(description);
    }

    // 締切日時を説明に追加
    if (deadline) {
      const deadlineText = '\n\n【締切】' + deadline;
      form.setDescription((description || '') + deadlineText);
    }

    // 選択肢の質問を追加
    const checkboxItem = form.addCheckboxItem();
    checkboxItem.setTitle('選択してください（複数選択可）');
    checkboxItem.setChoiceValues(options);
    checkboxItem.setRequired(false);

    // フォームURLを取得
    const formUrl = form.getPublishedUrl();
    const formId = form.getId();

    Logger.log('Google Form作成完了: ' + formUrl);

    // マスターシートに記録
    const sheet = getMasterSheet();
    const voteId = generateVoteId();
    const createdAt = new Date().toISOString();
    const status = 'active'; // active または expired

    sheet.appendRow([
      voteId,
      title,
      description || '',
      createdAt,
      deadline || '',
      formUrl,
      status,
      0 // 初期回答数
    ]);

    Logger.log('マスターシートに記録完了: ' + voteId);

    return {
      success: true,
      voteId: voteId,
      formUrl: formUrl,
      formId: formId,
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
 * 投票リストを取得
 */
function listVotes(params) {
  try {
    const sheet = getMasterSheet();
    const data = sheet.getDataRange().getValues();

    // ヘッダー行をスキップ
    const votes = [];
    const now = new Date();

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
      let status = row[6];
      const responseCount = row[7] || 0;

      // 締切をチェックしてステータスを更新
      if (deadline && status === 'active') {
        const deadlineDate = new Date(deadline);
        if (deadlineDate < now) {
          status = 'expired';
          // シートのステータスも更新
          sheet.getRange(i + 1, 7).setValue('expired');
        }
      }

      votes.push({
        voteId,
        title,
        description,
        createdAt,
        deadline,
        formUrl,
        status,
        responseCount
      });
    }

    // 新しい順に並べ替え（作成日時の降順）
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
 * 投票詳細を取得
 */
function getVoteDetails(params) {
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

        return {
          success: true,
          vote: {
            voteId: row[0],
            title: row[1],
            description: row[2],
            createdAt: row[3],
            deadline: row[4],
            formUrl: row[5],
            status: row[6],
            responseCount: row[7] || 0
          }
        };
      }
    }

    return {
      success: false,
      error: '投票が見つかりません'
    };

  } catch (error) {
    Logger.log('getVoteDetailsエラー: ' + error.toString());
    return {
      success: false,
      error: '投票詳細の取得に失敗しました: ' + error.toString()
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
 * テスト関数 - Apps Scriptエディタから直接実行可能
 */
function testCreateVote() {
  const result = createVote({
    title: 'テスト投票',
    description: 'これはテスト投票です',
    options: ['選択肢1', '選択肢2', '選択肢3'],
    deadline: '2025-12-31'
  });

  Logger.log(JSON.stringify(result));
}

function testListVotes() {
  const result = listVotes({});
  Logger.log(JSON.stringify(result));
}

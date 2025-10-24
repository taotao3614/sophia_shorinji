/**
 * 投票管理システム - Supabase統合版
 *
 * 🔄 変更点:
 * - Google SheetsからSupabaseへのデータ移行
 * - パフォーマンス向上: 10-50倍の高速化
 * - Google Formの回答は引き続きGoogle Sheetsに保存
 * - Supabaseには「誰が回答したか」のメタ情報のみを保存
 */

// ===== Supabase 設定 =====
var SUPABASE_URL = 'https://bgochhzpfoxjgmmgzdyp.supabase.co';
var SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnb2NoaHpwZm94amdtbWd6ZHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc0NDU3OCwiZXhwIjoyMDc2MzIwNTc4fQ.jVlWlfitiktkEGAJvas-D1wlrmwod6rKVjdJjbrL5J8';

// ===== 元の設定（バックアップ用） =====
var MASTER_SHEET_NAME = '投票管理';
var MEMBER_SHEET_NAME = '人員管理';
var CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';

/**
 * Supabaseへのリクエストを送信（汎用関数）
 *
 * @param {string} endpoint - APIエンドポイント (例: '/rest/v1/votes')
 * @param {string} method - HTTPメソッド ('GET', 'POST', 'PATCH', 'DELETE')
 * @param {object} payload - リクエストボディ (POST/PATCH用)
 * @param {string} query - クエリパラメータ (例: 'select=*&order=created_at.desc')
 * @return {object} レスポンスデータ（JSON）
 */
function callSupabase(endpoint, method, payload, query) {
  var url = SUPABASE_URL + endpoint;
  if (query) {
    url += '?' + query;
  }

  var options = {
    method: method || 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'  // INSERTした結果を返す
    },
    muteHttpExceptions: true
  };

  if (payload && (method === 'POST' || method === 'PATCH')) {
    options.payload = JSON.stringify(payload);
  }

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var content = response.getContentText();

    if (code < 200 || code >= 300) {
      Logger.log('Supabaseエラー: ' + code + ' - ' + content);
      throw new Error('Supabaseエラー: ' + content);
    }

    return content ? JSON.parse(content) : null;

  } catch (error) {
    Logger.log('Supabase通信エラー: ' + error.toString());
    throw error;
  }
}

/**
 * Web AppのPOSTリクエスト処理（変更なし）
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
      case 'getGroupNames':
        result = getGroupNames();
        break;
      case 'syncFormResponsesToSupabase':
        result = syncFormResponsesToSupabase(params.formId, params.voteId);
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
    message: '投票管理システムAPI (Supabase版) - POST /exec を使用してください',
    timestamp: new Date().toISOString(),
    version: '3.0-supabase'
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

// ========================================
// 🆕 Supabase版 - 主要機能
// ========================================

/**
 * 新規投票を作成（Supabase統合版）
 *
 * 🔄 変更点:
 * - Google Formの作成は変更なし
 * - 投票情報をSupabaseに保存
 * - Google Sheetsにもバックアップとして保存
 */
function createVote(params) {
  try {
    const { title, description, questions, deadline, targetGroup } = params;

    // バリデーション
    if (!title) {
      return {
        success: false,
        error: 'タイトルが必要です'
      };
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return {
        success: false,
        error: '問題を追加してください'
      };
    }

    if (!targetGroup) {
      return {
        success: false,
        error: '対象グループを選択してください'
      };
    }

    // ========== Google Form作成（変更なし） ==========
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

    // 複数の問題をループで追加
    for (var i = 0; i < questions.length; i++) {
      var question = questions[i];
      var qType = question.type;
      var qTitle = question.title || '';
      var qRequired = question.required !== false;
      var qOptions = question.options || [];

      Logger.log('問題 ' + (i + 1) + ' を追加: ' + qTitle + ' (type: ' + qType + ')');

      // 問題タイプに応じて質問を追加
      switch(qType) {
        case 'text':
          var textItem = form.addTextItem();
          textItem.setTitle(qTitle);
          if (question.helpText) {
            textItem.setHelpText(question.helpText);
          }
          textItem.setRequired(qRequired);
          break;

        case 'paragraph':
          var paragraphItem = form.addParagraphTextItem();
          paragraphItem.setTitle(qTitle);
          if (question.helpText) {
            paragraphItem.setHelpText(question.helpText);
          }
          paragraphItem.setRequired(qRequired);
          break;

        case 'radio':
          if (qOptions.length < 2) {
            return {
              success: false,
              error: '問題 "' + qTitle + '" の選択肢を2つ以上入力してください'
            };
          }
          var radioItem = form.addMultipleChoiceItem();
          radioItem.setTitle(qTitle);
          if (question.helpText) {
            radioItem.setHelpText(question.helpText);
          }
          radioItem.setChoiceValues(qOptions);
          radioItem.setRequired(qRequired);
          break;

        case 'checkbox':
          if (qOptions.length < 2) {
            return {
              success: false,
              error: '問題 "' + qTitle + '" の選択肢を2つ以上入力してください'
            };
          }
          var checkboxItem = form.addCheckboxItem();
          checkboxItem.setTitle(qTitle);
          if (question.helpText) {
            checkboxItem.setHelpText(question.helpText);
          }
          checkboxItem.setChoiceValues(qOptions);
          checkboxItem.setRequired(qRequired);
          break;

        default:
          Logger.log('警告: 不明な問題タイプ: ' + qType);
      }
    }

    // フォーム設定
    form.setCollectEmail(false);
    form.setLimitOneResponsePerUser(false);
    form.setShowLinkToRespondAgain(false);

    // フォームURLとIDを取得
    const formUrl = form.getPublishedUrl();
    const formId = form.getId();

    Logger.log('Google Form作成完了: ' + formUrl);

    // 回答用のSpreadsheetを作成して関連付け
    const responseSpreadsheet = SpreadsheetApp.create(title + ' (回答)');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSpreadsheet.getId());

    // 🆕 リンクを知っている全員が閲覧可能に設定
    const file = DriveApp.getFileById(responseSpreadsheet.getId());
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const responseSheetUrl = responseSpreadsheet.getUrl();
    Logger.log('回答用スプレッドシート作成完了（リンク共有有効）: ' + responseSheetUrl);

    // ========== 🆕 Supabaseに保存 ==========

    // 1. グループIDを取得
    Logger.log('🔍 グループIDを検索: ' + targetGroup);
    var groups = callSupabase(
      '/rest/v1/groups',
      'GET',
      null,
      'select=id&group_name=eq.' + encodeURIComponent(targetGroup)
    );

    if (groups.length === 0) {
      throw new Error('グループ「' + targetGroup + '」が見つかりません');
    }

    var targetGroupId = groups[0].id;
    Logger.log('✅ グループID取得: ' + targetGroupId);

    // 2. 投票情報をSupabaseに保存
    Logger.log('💾 Supabaseに投票を保存...');
    var voteData = {
      form_url: formUrl,
      form_id: formId,
      response_sheet_url: responseSheetUrl,
      title: title,
      description: description || '',
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status: 'active',
      target_group_id: targetGroupId,
      reminder_sent: false
    };

    var insertedVotes = callSupabase('/rest/v1/votes', 'POST', voteData);
    var voteId = insertedVotes[0].id;
    Logger.log('✅ 投票ID: ' + voteId);

    // 3. 問題をSupabaseに保存
    Logger.log('💾 問題をSupabaseに保存...');
    var questionsData = questions.map(function(q, index) {
      return {
        vote_id: voteId,
        question_order: index + 1,
        question_type: q.type,
        title: q.title,
        help_text: q.helpText || null,
        required: q.required !== false,
        options: (q.type === 'radio' || q.type === 'checkbox') ? q.options : null
      };
    });

    callSupabase('/rest/v1/vote_questions', 'POST', questionsData);
    Logger.log('✅ ' + questionsData.length + '個の問題を保存しました');

    // 4. 🆕 Google Form提出トリガーをインストール（自動同期用）
    try {
      Logger.log('🔧 フォーム提出トリガーをインストール中...');

      // 既存のトリガーを確認（重複防止）
      var existingTriggers = ScriptApp.getUserTriggers(form);
      existingTriggers.forEach(function(trigger) {
        if (trigger.getHandlerFunction() === 'onFormSubmitHandler') {
          ScriptApp.deleteTrigger(trigger);
        }
      });

      // 新しいトリガーを作成
      ScriptApp.newTrigger('onFormSubmitHandler')
        .forForm(form)
        .onFormSubmit()
        .create();

      // Form ID → Vote ID のマッピングを保存
      PropertiesService.getScriptProperties().setProperty('form_' + formId, voteId);

      Logger.log('✅ トリガーをインストールしました（新規回答が自動同期されます）');
    } catch (triggerError) {
      Logger.log('⚠️ トリガー設定エラー（手動同期は可能です）: ' + triggerError.toString());
    }

    // 5. (オプション) Google Sheetsにもバックアップ
    try {
      const sheet = getMasterSheet();
      const createdAt = new Date().toISOString();
      sheet.appendRow([
        formUrl,
        formId,
        responseSheetUrl,
        title,
        description || '',
        createdAt,
        deadline || '',
        'active',
        targetGroup,
        false
      ]);
      Logger.log('✅ Google Sheetsにも記録しました');
    } catch (sheetError) {
      Logger.log('⚠️ Google Sheets記録エラー（Supabaseには保存済み）: ' + sheetError.toString());
    }

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
      responseSheetUrl: responseSheetUrl,
      voteId: voteId,  // 🆕 Supabase の Vote ID を返す
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
 * 投票リストを取得（Supabase版）
 *
 * 🚀 パフォーマンス: Google Sheets読み込み（3-5秒）→ Supabase（100-300ms）
 */
function listVotes(params) {
  try {
    Logger.log('📋 投票リストを取得中...');

    // 🆕 Supabaseから投票リストを取得（グループ情報も含む）
    var votes = callSupabase(
      '/rest/v1/votes',
      'GET',
      null,
      'select=*,groups(group_name)&order=created_at.desc'
    );

    Logger.log('✅ ' + votes.length + '件の投票を取得');

    var now = new Date();

    // 締切をチェックしてステータスを更新
    votes = votes.map(function(vote) {
      var daysLeft = null;

      if (vote.deadline && vote.status === 'active') {
        var deadlineDate = new Date(vote.deadline);
        daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

        // 締切が過ぎた場合、ステータスを expired に更新
        if (daysLeft < 0) {
          callSupabase(
            '/rest/v1/votes',
            'PATCH',
            { status: 'expired' },
            'id=eq.' + vote.id
          );
          vote.status = 'expired';
        }
      }

      // 🔄 フロントエンド用にcamelCaseに変換
      return {
        voteId: vote.id,
        formUrl: vote.form_url,
        formId: vote.form_id,
        responseSheetUrl: vote.response_sheet_url,
        title: vote.title,
        description: vote.description,
        createdAt: vote.created_at,
        deadline: vote.deadline,
        status: vote.status,
        targetGroup: vote.groups ? vote.groups.group_name : '',
        daysLeft: daysLeft,
        reminderSent: vote.reminder_sent
      };
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
 * 投票詳細を取得（Supabase版 + 自動同期）
 *
 * 🔑 重要: Google Formの回答を自動的にSupabaseに同期してから詳細を返す
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

    Logger.log('🔍 投票を検索: ' + formUrl);

    // 1. Supabaseから投票情報を取得
    var votes = callSupabase(
      '/rest/v1/votes',
      'GET',
      null,
      'select=*,groups(id,group_name)&form_url=eq.' + encodeURIComponent(formUrl)
    );

    if (votes.length === 0) {
      return {
        success: false,
        error: '投票が見つかりません'
      };
    }

    var vote = votes[0];
    var voteId = vote.id;
    var targetGroupId = vote.groups.id;
    var targetGroupName = vote.groups.group_name;

    Logger.log('✅ 投票を取得: ' + vote.title + ' (ID: ' + voteId + ')');

    // 2. 🔥 最新の回答をGoogle FormからSupabaseに同期
    Logger.log('🔄 Google Formの回答を同期中...');
    var syncResult = syncFormResponsesToSupabase(vote.form_id, voteId);
    Logger.log('✅ 同期完了: ' + syncResult.synced + '件の新規回答');

    // 3. 対象グループのメンバーを取得
    var targetMembers = callSupabase(
      '/rest/v1/group_members',
      'GET',
      null,
      'select=student_id,members(name)&group_id=eq.' + targetGroupId
    );

    var targetMembersList = targetMembers.map(function(m) {
      return {
        studentId: m.student_id,
        name: m.members.name
      };
    });

    Logger.log('✅ 対象メンバー: ' + targetMembersList.length + '人');

    // 4. 回答済みメンバーを取得
    var respondedMembers = callSupabase(
      '/rest/v1/vote_responses',
      'GET',
      null,
      'select=student_id,members(name),responded_at&vote_id=eq.' + voteId
    );

    var respondedMembersList = respondedMembers.map(function(r) {
      return {
        studentId: r.student_id,
        name: r.members.name
      };
    });

    Logger.log('✅ 回答済み: ' + respondedMembersList.length + '人');

    // 5. 未回答メンバーを計算
    var respondedSet = {};
    respondedMembersList.forEach(function(m) {
      respondedSet[m.studentId] = true;
    });

    var notRespondedMembersList = targetMembersList.filter(function(m) {
      return !respondedSet[m.studentId];
    });

    Logger.log('✅ 未回答: ' + notRespondedMembersList.length + '人');

    // 締切までの日数を計算
    var daysLeft = null;
    if (vote.deadline) {
      var now = new Date();
      var deadlineDate = new Date(vote.deadline);
      daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    }

    return {
      success: true,
      vote: {
        formUrl: vote.form_url,
        formId: vote.form_id,
        responseSheetUrl: vote.response_sheet_url,
        title: vote.title,
        description: vote.description,
        createdAt: vote.created_at,
        deadline: vote.deadline,
        status: vote.status,
        daysLeft: daysLeft
      },
      stats: {
        total: targetMembersList.length,
        respondedCount: respondedMembersList.length,
        notRespondedCount: notRespondedMembersList.length
      },
      respondedMembers: respondedMembersList,
      notRespondedMembers: notRespondedMembersList
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
 * Google Formの回答をSupabaseに同期
 *
 * 🔑 重要機能: 既存の回答はスキップし、新規回答のみを追加
 *
 * @param {string} formId - Form ID
 * @param {string} voteId - Vote ID (Supabase UUID)
 * @return {object} 同期結果 { success, synced, total }
 */
function syncFormResponsesToSupabase(formId, voteId) {
  try {
    // 1. Google Formの回答を取得
    Logger.log('📝 Google Formの回答を取得中...');
    var form = FormApp.openById(formId);
    var responses = form.getResponses();

    if (responses.length === 0) {
      Logger.log('回答がまだありません');
      return { success: true, synced: 0, total: 0 };
    }

    Logger.log('✅ ' + responses.length + '件の回答を取得');

    // 2. 既に同期済みの学号を取得
    Logger.log('🔍 既存の回答を確認中...');
    var existingResponses = callSupabase(
      '/rest/v1/vote_responses',
      'GET',
      null,
      'select=student_id&vote_id=eq.' + voteId
    );

    var syncedStudentIds = {};
    existingResponses.forEach(function(r) {
      syncedStudentIds[r.student_id] = true;
    });

    Logger.log('✅ 既存の回答: ' + existingResponses.length + '件');

    // 3. 新しい回答のみを抽出
    var newResponses = [];
    responses.forEach(function(response) {
      var itemResponses = response.getItemResponses();
      if (itemResponses.length > 0) {
        // 最初の質問が学号
        var studentId = String(itemResponses[0].getResponse()).trim();

        // 未同期 かつ 重複していない場合のみ追加
        if (studentId && !syncedStudentIds[studentId]) {
          newResponses.push({
            vote_id: voteId,
            student_id: studentId,
            responded_at: response.getTimestamp().toISOString()
          });
          syncedStudentIds[studentId] = true;  // 重複防止
        }
      }
    });

    // 4. Supabaseに一括INSERT
    if (newResponses.length > 0) {
      Logger.log('💾 Supabaseに' + newResponses.length + '件の新規回答を保存中...');
      callSupabase('/rest/v1/vote_responses', 'POST', newResponses);
      Logger.log('✅ ' + newResponses.length + '件の回答を同期しました');
    } else {
      Logger.log('ℹ️ 新規回答はありません（すべて同期済み）');
    }

    return {
      success: true,
      synced: newResponses.length,
      total: responses.length
    };

  } catch (error) {
    Logger.log('❌ 同期エラー: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      synced: 0,
      total: 0
    };
  }
}

/**
 * グループ名一覧を取得（Supabase版）
 */
function getGroupNames() {
  try {
    Logger.log('📋 グループ名を取得中...');

    // 🆕 Supabaseから取得
    var groups = callSupabase(
      '/rest/v1/groups',
      'GET',
      null,
      'select=group_name&order=group_name.asc'
    );

    var groupNames = groups.map(function(g) {
      return g.group_name;
    });

    Logger.log('✅ ' + groupNames.length + '個のグループを取得');

    return {
      success: true,
      groups: groupNames
    };

  } catch (error) {
    Logger.log('getGroupNamesエラー: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * すべてのアクティブな投票の回答を同期（定時実行用）
 *
 * ⏰ 推奨実行頻度: 1時間ごと
 */
function syncAllActiveVotes() {
  try {
    Logger.log('========================================');
    Logger.log('⏰ 定時同期開始: ' + new Date().toISOString());
    Logger.log('========================================');

    // アクティブな投票を取得
    var activeVotes = callSupabase(
      '/rest/v1/votes',
      'GET',
      null,
      'select=id,form_id,title&status=eq.active'
    );

    Logger.log('✅ アクティブな投票: ' + activeVotes.length + '件');

    if (activeVotes.length === 0) {
      Logger.log('ℹ️ 同期対象の投票がありません');
      return { success: true, totalSynced: 0 };
    }

    // 各投票の回答を同期
    var totalSynced = 0;
    var successCount = 0;
    var errorCount = 0;

    activeVotes.forEach(function(vote, index) {
      try {
        Logger.log('');
        Logger.log('--- [' + (index + 1) + '/' + activeVotes.length + '] ' + vote.title + ' ---');
        var result = syncFormResponsesToSupabase(vote.form_id, vote.id);

        if (result.success) {
          totalSynced += result.synced;
          successCount++;
        } else {
          errorCount++;
          Logger.log('⚠️ 同期失敗: ' + result.error);
        }
      } catch (error) {
        errorCount++;
        Logger.log('❌ エラー: ' + error.toString());
      }
    });

    Logger.log('');
    Logger.log('========================================');
    Logger.log('✅ 定時同期完了');
    Logger.log('  - 対象投票: ' + activeVotes.length + '件');
    Logger.log('  - 成功: ' + successCount + '件');
    Logger.log('  - 失敗: ' + errorCount + '件');
    Logger.log('  - 新規同期数: ' + totalSynced + '件');
    Logger.log('========================================');

    return {
      success: true,
      totalVotes: activeVotes.length,
      successCount: successCount,
      errorCount: errorCount,
      totalSynced: totalSynced
    };

  } catch (error) {
    Logger.log('========================================');
    Logger.log('❌ 定時同期エラー: ' + error.toString());
    Logger.log('========================================');
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 締切日をチェックして提醒（定時実行用）
 */
function checkDeadlines() {
  try {
    Logger.log('⏰ 締切チェック開始');

    // アクティブな投票を取得
    var activeVotes = callSupabase(
      '/rest/v1/votes',
      'GET',
      null,
      'select=id,title,deadline&status=eq.active&deadline=not.is.null'
    );

    var now = new Date();
    var expiredCount = 0;

    activeVotes.forEach(function(vote) {
      var deadlineDate = new Date(vote.deadline);
      var daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

      // 過期: ステータスを更新
      if (daysLeft < 0) {
        callSupabase(
          '/rest/v1/votes',
          'PATCH',
          { status: 'expired' },
          'id=eq.' + vote.id
        );
        expiredCount++;
        Logger.log('期限切れに更新: ' + vote.title);
      }
    });

    Logger.log('✅ 締切チェック完了: ' + expiredCount + '件を期限切れに更新');

    return {
      success: true,
      checkedCount: activeVotes.length,
      expiredCount: expiredCount,
      message: activeVotes.length + '件の投票をチェック、' + expiredCount + '件を期限切れに更新しました'
    };

  } catch (error) {
    Logger.log('checkDeadlinesエラー: ' + error.toString());
    return {
      success: false,
      error: '締切チェックに失敗しました: ' + error.toString()
    };
  }
}

// ========================================
// 🆕 バックアップ・管理用関数
// ========================================

/**
 * マスターシートを取得（バックアップ用）
 */
function getMasterSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MASTER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(MASTER_SHEET_NAME);
    sheet.getRange(1, 1, 1, 10).setValues([[
      'Google Form URL',
      'Form ID',
      'Response Sheet URL',
      '投票タイトル',
      '投票説明',
      '作成日時',
      '締切日時',
      'ステータス',
      '対象グループ',
      '提醒送信済'
    ]]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Flex Messageを生成（変更なし）
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
 * 🆕 Google Form提出時の自動同期ハンドラー
 *
 * このトリガーは createVote() で自動的にインストールされます
 * 新しい回答が提出されるたびに即座にSupabaseに同期します
 *
 * @param {Object} e - フォーム提出イベントオブジェクト
 */
function onFormSubmitHandler(e) {
  try {
    Logger.log('========================================');
    Logger.log('📝 新しい回答を検出: ' + new Date().toISOString());
    Logger.log('========================================');

    // Form IDを取得
    var formId = e.source.getId();
    Logger.log('Form ID: ' + formId);

    // Vote IDを取得（PropertiesServiceから）
    var voteId = PropertiesService.getScriptProperties().getProperty('form_' + formId);

    if (!voteId) {
      Logger.log('⚠️ Vote IDが見つかりません（古いフォームの可能性）');
      return;
    }

    Logger.log('Vote ID: ' + voteId);

    // 回答を同期
    Logger.log('🔄 Supabaseに同期中...');
    var result = syncFormResponsesToSupabase(formId, voteId);

    if (result.success) {
      Logger.log('✅ 同期成功: ' + result.synced + '件の新規回答を追加');
      Logger.log('総回答数: ' + result.total + '件');
    } else {
      Logger.log('❌ 同期失敗: ' + result.error);
    }

    Logger.log('========================================');

  } catch (error) {
    Logger.log('========================================');
    Logger.log('❌ onFormSubmitHandler エラー: ' + error.toString());
    Logger.log('========================================');
  }
}

/**
 * 定時トリガーを設定（初回のみ手動実行）
 * ⚠️ この関数はGASエディタから手動で1回だけ実行してください
 */
function setupSyncTrigger() {
  try {
    // 既存のトリガーを削除（重複防止）
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'syncAllActiveVotes') {
        ScriptApp.deleteTrigger(trigger);
        Logger.log('既存のトリガーを削除しました');
      }
    });

    // 新しいトリガーを作成（毎時実行）
    ScriptApp.newTrigger('syncAllActiveVotes')
      .timeBased()
      .everyHours(1)
      .create();

    Logger.log('✅ 定時トリガーを設定しました（1時間ごと）');
    Logger.log('次回実行時刻: ' + new Date(Date.now() + 3600000).toLocaleString('ja-JP'));

    return { success: true, message: '定時トリガーを設定しました' };

  } catch (error) {
    Logger.log('❌ トリガー設定エラー: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

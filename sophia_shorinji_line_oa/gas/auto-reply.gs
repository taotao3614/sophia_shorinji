/**
 * 上智大学少林寺拳法部 LINE OA
 * Google Apps Script - 自動返信機能
 *
 * 外部申請フォーム送信時に自動返信メッセージを送信
 */

// LINE Messaging API設定
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_CHANNEL_ACCESS_TOKEN_HERE';
const LINE_MESSAGING_API_URL = 'https://api.line.me/v2/bot/message/reply';

// 送信上限管理
const MONTHLY_MESSAGE_LIMIT = 400; // 無料枠の80%
const PROPERTY_SERVICE = PropertiesService.getScriptProperties();

/**
 * フォーム送信時のトリガー関数
 * Google Formの「フォーム送信時」トリガーに設定
 */
function onFormSubmit(e) {
  try {
    // 送信上限チェック
    if (!checkMessageLimit()) {
      Logger.log('月間送信上限に達しています');
      sendAdminAlert('送信上限到達', '月間メッセージ送信上限に達しました。');
      return;
    }

    // フォーム回答を取得
    const itemResponses = e.response.getItemResponses();
    const answers = {};

    itemResponses.forEach(itemResponse => {
      const question = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      answers[question] = answer;
    });

    // LINE UserIDを取得（フォームに含まれている場合）
    // 注: 実際の実装では、LIFFからフォームを開く際にUserIDを渡す必要があります
    const lineUserId = answers['LINE User ID'] || null;

    if (lineUserId) {
      // 自動返信メッセージを送信
      sendAutoReplyMessage(lineUserId, answers);

      // 送信カウントを更新
      incrementMessageCount();
    }

    // 管理者に通知（オプション）
    notifyAdmin(answers);

  } catch (error) {
    Logger.log('エラー: ' + error.toString());
    sendAdminAlert('エラー発生', error.toString());
  }
}

/**
 * 自動返信メッセージを送信
 */
function sendAutoReplyMessage(userId, answers) {
  const replyMessage = {
    type: 'text',
    text: `【申請受付完了】\n\nこの度は上智大学少林寺拳法部へのお申し込みありがとうございます。\n\n担当者より3営業日以内にご連絡いたします。\nしばらくお待ちください。\n\n【申請内容】\n${formatAnswers(answers)}\n\n上智大学少林寺拳法部`
  };

  const options = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify({
      to: userId,
      messages: [replyMessage]
    })
  };

  try {
    const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
    Logger.log('メッセージ送信成功: ' + response.getContentText());
  } catch (error) {
    Logger.log('メッセージ送信失敗: ' + error.toString());
    throw error;
  }
}

/**
 * 回答内容をフォーマット
 */
function formatAnswers(answers) {
  let formatted = '';
  for (const [question, answer] of Object.entries(answers)) {
    if (question !== 'LINE User ID') {
      formatted += `・${question}: ${answer}\n`;
    }
  }
  return formatted;
}

/**
 * 送信上限チェック
 */
function checkMessageLimit() {
  const currentMonth = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM');
  const storedMonth = PROPERTY_SERVICE.getProperty('current_month') || '';

  // 月が変わったらカウントをリセット
  if (currentMonth !== storedMonth) {
    PROPERTY_SERVICE.setProperty('current_month', currentMonth);
    PROPERTY_SERVICE.setProperty('message_count', '0');
    return true;
  }

  const messageCount = parseInt(PROPERTY_SERVICE.getProperty('message_count') || '0');
  return messageCount < MONTHLY_MESSAGE_LIMIT;
}

/**
 * 送信カウントを増やす
 */
function incrementMessageCount() {
  const messageCount = parseInt(PROPERTY_SERVICE.getProperty('message_count') || '0');
  PROPERTY_SERVICE.setProperty('message_count', (messageCount + 1).toString());

  // 上限の80%に達したら警告
  if (messageCount + 1 >= MONTHLY_MESSAGE_LIMIT * 0.8) {
    sendAdminAlert('送信上限警告', `現在の送信数: ${messageCount + 1}/${MONTHLY_MESSAGE_LIMIT}`);
  }
}

/**
 * 管理者に通知
 */
function notifyAdmin(answers) {
  const subject = '【新規申請】上智大学少林寺拳法部';
  const body = `新しい申請がありました。\n\n${formatAnswers(answers)}\n\nGoogleフォームで詳細を確認してください。`;

  // 管理者メールアドレスを設定
  const adminEmail = 'admin@example.com'; // 実際のメールアドレスに変更

  try {
    GmailApp.sendEmail(adminEmail, subject, body);
  } catch (error) {
    Logger.log('管理者通知送信失敗: ' + error.toString());
  }
}

/**
 * 管理者アラート送信
 */
function sendAdminAlert(title, message) {
  Logger.log(`[${title}] ${message}`);
  // 必要に応じてメール送信やSlack通知を実装
}

/**
 * 手動テスト用関数
 */
function testAutoReply() {
  const testAnswers = {
    '氏名': 'テスト太郎',
    '所属': 'テスト大学',
    '希望日': '2025年1月15日',
    'LINE User ID': 'U1234567890abcdef'
  };

  sendAutoReplyMessage('U1234567890abcdef', testAnswers);
}

/**
 * 現在の送信数を確認
 */
function checkCurrentMessageCount() {
  const messageCount = PROPERTY_SERVICE.getProperty('message_count') || '0';
  const currentMonth = PROPERTY_SERVICE.getProperty('current_month') || '';
  Logger.log(`現在の月: ${currentMonth}`);
  Logger.log(`送信数: ${messageCount}/${MONTHLY_MESSAGE_LIMIT}`);
}

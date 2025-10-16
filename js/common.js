/**
 * 共通JavaScript関数
 * LIFF初期化とユーティリティ関数を提供
 */

// グローバル設定オブジェクト
let config = null;

/**
 * config.jsonを読み込み
 */
async function loadConfig() {
  try {
    const response = await fetch('./config/config.json');
    if (!response.ok) {
      throw new Error('config.jsonの読み込みに失敗しました');
    }
    config = await response.json();
    return config;
  } catch (error) {
    console.error('Config読み込みエラー:', error);
    throw error;
  }
}

/**
 * LIFF初期化
 */
async function initializeLiff() {
  try {
    // configを読み込み
    if (!config) {
      await loadConfig();
    }

    const liffId = config.liffId;
    if (!liffId) {
      throw new Error('LIFF IDが設定されていません');
    }

    // LIFF初期化
    await liff.init({ liffId: liffId });

    // ログイン状態をチェック
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    console.log('LIFF初期化成功');
    return true;

  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    throw error;
  }
}

/**
 * ユーザープロフィールを取得
 */
async function getUserProfile() {
  try {
    if (!liff.isLoggedIn()) {
      throw new Error('ログインしていません');
    }

    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage
    };
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    // LIFF外で開いている場合はダミーデータを返す
    return {
      userId: 'dummy_user',
      displayName: 'テストユーザー',
      pictureUrl: '',
      statusMessage: ''
    };
  }
}

/**
 * メッセージを共有（ShareTargetPicker）
 */
function shareMessage(text) {
  if (!liff.isInClient()) {
    alert('LINE内でのみ使用できます');
    return;
  }

  liff.shareTargetPicker([
    {
      type: 'text',
      text: text
    }
  ]).then(() => {
    console.log('共有成功');
  }).catch((error) => {
    console.error('共有エラー:', error);
  });
}

/**
 * 外部URLを開く
 */
function openExternalUrl(url) {
  if (liff.isInClient()) {
    liff.openWindow({
      url: url,
      external: true
    });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * アラート表示
 */
function showAlert(message, type = 'info') {
  // 既存のアラートを削除
  const existingAlert = document.querySelector('.alert');
  if (existingAlert) {
    existingAlert.remove();
  }

  // 新しいアラートを作成
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 24px;
    background-color: ${type === 'success' ? '#2d7a3e' : type === 'error' ? '#b8282d' : type === 'warning' ? '#c9a961' : '#4a5159'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    animation: slideDown 0.3s ease;
    max-width: 90%;
    text-align: center;
  `;
  alert.textContent = message;

  document.body.appendChild(alert);

  // 3秒後に自動削除
  setTimeout(() => {
    alert.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

/**
 * ローディング表示
 */
function showLoading() {
  const loading = document.querySelector('.loading');
  if (loading) {
    loading.style.display = 'flex';
  }
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const loading = document.querySelector('.loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

/**
 * 日付フォーマット (YYYY-MM-DD)
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日時フォーマット (YYYY-MM-DD HH:mm)
 */
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * グローバルエラーハンドラー
 */
window.addEventListener('error', (event) => {
  console.error('グローバルエラー:', event.error);
});

/**
 * Promise拒否ハンドラー
 */
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise拒否:', event.reason);
});

// CSSアニメーション定義を追加
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }
`;
document.head.appendChild(style);

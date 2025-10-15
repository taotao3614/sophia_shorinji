// 上智大学少林寺拳法部 LINE OA - Common JavaScript

let config = null;

// 設定ファイルを読み込む
async function loadConfig() {
  try {
    const response = await fetch('./config/config.json');
    config = await response.json();
    return config;
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error);
    showAlert('設定ファイルの読み込みに失敗しました', 'error');
    return null;
  }
}

// LIFF初期化
async function initializeLiff() {
  try {
    await loadConfig();

    if (!config || !config.liffId) {
      throw new Error('LIFF IDが設定されていません');
    }

    await liff.init({ liffId: config.liffId });

    if (!liff.isLoggedIn()) {
      liff.login();
    }

    return true;
  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    showAlert('LIFFの初期化に失敗しました', 'error');
    return false;
  }
}

// ユーザープロフィール取得
async function getUserProfile() {
  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage
    };
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    return null;
  }
}

// メッセージ共有（shareTargetPicker）
async function shareMessage(message) {
  try {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      showAlert('この機能はこの環境ではサポートされていません', 'error');
      return false;
    }

    const result = await liff.shareTargetPicker([
      {
        type: 'text',
        text: message
      }
    ]);

    if (result) {
      showAlert('メッセージを共有しました', 'success');
      return true;
    } else {
      showAlert('共有がキャンセルされました', 'info');
      return false;
    }
  } catch (error) {
    console.error('共有エラー:', error);
    showAlert('共有に失敗しました', 'error');
    return false;
  }
}

// FlexMessage形式で共有
async function shareFlexMessage(altText, flexMessage) {
  try {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      showAlert('この機能はこの環境ではサポートされていません', 'error');
      return false;
    }

    const result = await liff.shareTargetPicker([
      {
        type: 'flex',
        altText: altText,
        contents: flexMessage
      }
    ]);

    if (result) {
      showAlert('メッセージを共有しました', 'success');
      return true;
    } else {
      showAlert('共有がキャンセルされました', 'info');
      return false;
    }
  } catch (error) {
    console.error('共有エラー:', error);
    showAlert('共有に失敗しました', 'error');
    return false;
  }
}

// 外部URLを開く
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

// アラート表示
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  const container = document.querySelector('.container');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);

    // 3秒後に自動削除
    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  }
}

// ローディング表示
function showLoading() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading-overlay';
  loadingDiv.className = 'loading';
  loadingDiv.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(loadingDiv);
}

// ローディング非表示
function hideLoading() {
  const loadingDiv = document.getElementById('loading-overlay');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// 日付フォーマット
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// 時刻フォーマット
function formatTime(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// LIFFウィンドウを閉じる
function closeLiffWindow() {
  liff.closeWindow();
}

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('グローバルエラー:', event.error);
});

// Promise拒否のハンドリング
window.addEventListener('unhandledrejection', (event) => {
  console.error('未処理のPromise拒否:', event.reason);
});

// 設定取得用ヘルパー関数
function getConfig() {
  return config;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadConfig,
    initializeLiff,
    getUserProfile,
    shareMessage,
    shareFlexMessage,
    openExternalUrl,
    showAlert,
    showLoading,
    hideLoading,
    formatDate,
    formatTime,
    closeLiffWindow,
    getConfig
  };
}

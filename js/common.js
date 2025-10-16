/**
 * 共通関数ライブラリ
 * すべてのLIFFページで共有される関数
 */

// ===== 設定 =====
const LIFF_CONFIG = {
  liffId: '2008292404-7kjGRzVn',
  gasUrl: 'https://script.google.com/macros/s/AKfycbwsGVwXluq1wLtcLxD1G4poINKSg1qKetjbqiG7Rpb5nHslJP1nkhgSUSPrqMOwi1zu/exec'
};

// グローバル変数
let userProfile = null;

// ===== LIFF 関連 =====

/**
 * LIFF を初期化してユーザープロフィールを取得
 * @returns {Promise<Object>} ユーザープロフィール
 */
async function initLiff() {
  try {
    // LIFF 初期化
    await liff.init({ liffId: LIFF_CONFIG.liffId });

    // ログイン状態をチェック
    if (!liff.isLoggedIn()) {
      liff.login();
      return null;
    }

    // ユーザープロフィール取得
    try {
      userProfile = await liff.getProfile();
      console.log('ユーザープロフィール取得成功:', userProfile.displayName);
    } catch (error) {
      console.warn('プロフィール取得失敗（LIFF外の可能性）');
      // テスト用ダミーユーザー
      userProfile = {
        userId: 'test_user_' + Date.now(),
        displayName: 'テストユーザー',
        pictureUrl: '',
        statusMessage: ''
      };
    }

    return userProfile;

  } catch (error) {
    console.error('LIFF初期化エラー:', error);
    throw new Error('LIFFの初期化に失敗しました: ' + error.message);
  }
}

/**
 * ユーザープロフィールを取得
 * @returns {Object} ユーザープロフィール
 */
function getUserProfile() {
  return userProfile;
}

/**
 * LINE 内で実行されているかチェック
 * @returns {boolean}
 */
function isInLineApp() {
  return liff.isInClient();
}

// ===== GAS API 呼び出し =====

/**
 * GAS API を呼び出す
 * @param {string} action - アクション名
 * @param {Object} params - パラメータ
 * @returns {Promise<Object>} レスポンス
 */
async function callGAS(action, params = {}) {
  try {
    const response = await fetch(LIFF_CONFIG.gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action,
        ...params
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'APIエラーが発生しました');
    }

    return result;

  } catch (error) {
    console.error('GAS API 呼び出しエラー:', error);
    throw error;
  }
}

// ===== UI ヘルパー関数 =====

/**
 * ローディングインジケータを表示
 */
function showLoading() {
  let loadingEl = document.getElementById('global-loading');

  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'global-loading';
    loadingEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    loadingEl.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
      ">
        <div class="spinner" style="
          border: 4px solid #f3f3f3;
          border-top: 4px solid #b8282d;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        "></div>
        <p style="margin: 0; color: #666;">処理中...</p>
      </div>
    `;
    document.body.appendChild(loadingEl);

    // スピンアニメーションを追加
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  loadingEl.style.display = 'flex';
}

/**
 * ローディングインジケータを非表示
 */
function hideLoading() {
  const loadingEl = document.getElementById('global-loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

/**
 * アラートメッセージを表示
 * @param {string} message - メッセージ
 * @param {string} type - タイプ ('success', 'error', 'warning', 'info')
 */
function showAlert(message, type = 'info') {
  // シンプルな alert で代用（後で改善可能）
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const icon = icons[type] || icons.info;
  alert(`${icon} ${message}`);
}

/**
 * 確認ダイアログを表示
 * @param {string} message - メッセージ
 * @returns {boolean} OK が押されたら true
 */
function showConfirm(message) {
  return confirm(message);
}

// ===== ユーティリティ関数 =====

/**
 * 日付を YYYY/MM/DD 形式でフォーマット
 * @param {string|Date} dateString - 日付文字列または Date オブジェクト
 * @returns {string} フォーマットされた日付
 */
function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * 日付を YYYY/MM/DD HH:MM 形式でフォーマット
 * @param {string|Date} dateString - 日付文字列または Date オブジェクト
 * @returns {string} フォーマットされた日時
 */
function formatDateTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * HTML をエスケープ（XSS 対策）
 * @param {string} text - エスケープする文字列
 * @returns {string} エスケープされた文字列
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * URL を開く（LINE 内 / 外で適切に処理）
 * @param {string} url - 開く URL
 */
function openUrl(url) {
  if (isInLineApp()) {
    liff.openWindow({
      url: url,
      external: true
    });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * デバッグログ出力（開発環境のみ）
 * @param {...any} args - ログ内容
 */
function debugLog(...args) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[DEBUG]', ...args);
  }
}

// ===== エクスポート（グローバルスコープに公開） =====
// この関数は自動的にグローバルスコープで利用可能

console.log('✅ common.js ロード完了');

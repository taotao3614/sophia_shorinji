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
    console.log('🔄 LIFF初期化を開始...');

    // LIFF 初期化
    await liff.init({ liffId: LIFF_CONFIG.liffId });
    console.log('✅ LIFF SDK初期化成功');

    // ログイン状態をチェック
    if (!liff.isLoggedIn()) {
      console.warn('⚠️ LIFFにログインしていません');

      // デバッグモード: ブラウザで直接開いた場合はテストユーザーを使用
      if (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          !liff.isInClient()) {
        console.log('🧪 デバッグモード: テストユーザーを使用');
        userProfile = {
          userId: 'test_user_' + Date.now(),
          displayName: 'テストユーザー',
          pictureUrl: '',
          statusMessage: ''
        };
        return userProfile;
      }

      // LINE内で未ログインの場合はログイン画面へ
      console.log('🔐 LINEログインページへリダイレクト...');
      liff.login();
      return null;
    }

    // ユーザープロフィール取得
    try {
      userProfile = await liff.getProfile();
      console.log('✅ ユーザープロフィール取得成功:', userProfile.displayName);
    } catch (error) {
      console.warn('⚠️ プロフィール取得失敗（LIFF外の可能性）');
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
    console.error('❌ LIFF初期化エラー:', error);

    // LIFFエラーでもテストユーザーで続行(開発用)
    console.log('🧪 エラー発生 - テストユーザーで続行');
    userProfile = {
      userId: 'test_user_fallback',
      displayName: 'テストユーザー (Fallback)',
      pictureUrl: '',
      statusMessage: ''
    };
    return userProfile;
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
    console.log('🔗 GAS API 呼び出し:', action, params);
    console.log('📍 GAS URL:', LIFF_CONFIG.gasUrl);

    const requestBody = {
      action: action,
      ...params
    };

    console.log('📤 Request body:', JSON.stringify(requestBody));

    const response = await fetch(LIFF_CONFIG.gasUrl, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      redirect: 'follow'  // GAS のリダイレクトを追跡
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const responseText = await response.text();
    console.log('📥 Response text:', responseText.substring(0, 200));

    const result = JSON.parse(responseText);
    console.log('✅ GAS API 応答:', result);

    if (!result.success) {
      throw new Error(result.error || 'APIエラーが発生しました');
    }

    return result;

  } catch (error) {
    console.error('❌ GAS API 呼び出しエラー:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ===== UI ヘルパー関数 =====

/**
 * ローディングインジケータを表示
 * @param {string} message - 表示するメッセージ（オプション）
 */
function showLoading(message = '処理中...') {
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
        padding: 30px 40px;
        border-radius: 8px;
        text-align: center;
        max-width: 80%;
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
        <p id="loading-message" style="margin: 0; color: #666; font-size: 0.95rem; line-height: 1.5;"></p>
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

  // メッセージを更新
  const messageEl = loadingEl.querySelector('#loading-message');
  if (messageEl) {
    messageEl.textContent = message;
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
  console.log('🌐 URLを開く:', url);

  if (isInLineApp()) {
    console.log('📱 LINE内で実行中 - 外部ブラウザで開きます');
    liff.openWindow({
      url: url,
      external: true  // 外部ブラウザで開く（共有可能）
    });
  } else {
    console.log('💻 ブラウザで実行中 - 新しいタブで開きます');
    window.open(url, '_blank');
  }
}

/**
 * アプリ内ページへルーティング経由で遷移
 * @param {string} page - ページ名 ('vote', 'vote-detail', 'attendance', 'notice')
 * @param {Object} params - 追加のクエリパラメータ（オプション）
 */
function navigateToPage(page, params = {}) {
  // 現在のベースURLを取得（最後のファイル名を除く）
  const currentUrl = window.location.href;
  const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);

  // index.html へのURLを構築
  const url = new URL('index.html', baseUrl);
  url.searchParams.set('page', page);

  // 追加パラメータを設定
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  console.log('🔀 ページ遷移:', page, 'URL:', url.href);
  window.location.href = url.href;
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

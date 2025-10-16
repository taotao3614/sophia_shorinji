# アーキテクチャ設計書

## 概要

このプロジェクトは、単一のLIFFアプリケーションで複数の機能（投票管理、出勤管理、お知らせ管理など）を提供するマルチエントリーアーキテクチャを採用しています。

## システム構成

```
sophia_shorinji/
├── index.html              # ルーティングディスパッチャ（エントリーポイント）
├── js/
│   └── common.js          # 共通関数ライブラリ
├── vote-manager.html      # 投票管理ページ
├── attendance-manager.html # 出勤管理ページ（未実装）
├── notice-manager.html    # お知らせ管理ページ（未実装）
└── gas/
    └── vote-manager.gs    # Google Apps Script バックエンド
```

## コアコンセプト

### 1. 単一LIFF + ルーティングパターン

複数のLIFF IDを作成する代わりに、1つのLIFF IDを使用してURLパラメータで機能を切り替えます。

**メリット**:
- LIFF IDの管理が簡単
- 共通コードの再利用が容易
- Rich Menuの設定がシンプル

### 2. URLパラメータによるページ切り替え

```
基本URL: https://liff.line.me/2008292404-7kjGRzVn

投票管理: https://liff.line.me/2008292404-7kjGRzVn?page=vote
出勤管理: https://liff.line.me/2008292404-7kjGRzVn?page=attendance
お知らせ: https://liff.line.me/2008292404-7kjGRzVn?page=notice
```

### 3. 共通コードライブラリ

`js/common.js` にすべてのページで使用する関数を集約します。

## ファイル詳細

### index.html

**役割**: ルーティングディスパッチャ

**処理フロー**:
1. URLパラメータ `page` を取得
2. LIFF を初期化
3. ログイン状態をチェック
4. `page` パラメータに応じて適切なページにリダイレクト

**コード構造**:
```javascript
const PAGE_MAP = {
  'vote': './vote-manager.html',
  'attendance': './attendance-manager.html',
  'notice': './notice-manager.html'
};
const DEFAULT_PAGE = 'vote';  // デフォルトページ
```

### js/common.js

**役割**: すべてのページで共有される関数ライブラリ

**提供機能**:

#### LIFF関連
- `initLiff()` - LIFF初期化とログイン処理
- `getUserProfile()` - ユーザープロフィール取得
- `isInLineApp()` - LINE内実行チェック

#### API通信
- `callGAS(action, params)` - GAS APIの統一呼び出しインターフェース

#### UI ヘルパー
- `showLoading()` - ローディング表示
- `hideLoading()` - ローディング非表示
- `showAlert(message, type)` - アラート表示
- `showConfirm(message)` - 確認ダイアログ

#### ユーティリティ
- `formatDate(dateString)` - 日付フォーマット（YYYY/MM/DD）
- `formatDateTime(dateString)` - 日時フォーマット（YYYY/MM/DD HH:MM）
- `escapeHtml(text)` - HTMLエスケープ（XSS対策）
- `openUrl(url)` - LINE内/外で適切にURL開く
- `debugLog(...args)` - 開発環境専用ログ

**設定**:
```javascript
const LIFF_CONFIG = {
  liffId: '2008292404-7kjGRzVn',
  gasUrl: 'https://script.google.com/macros/s/AKfycbwsGVwXluq1wLtcLxD1G4poINKSg1qKetjbqiG7Rpb5nHslJP1nkhgSUSPrqMOwi1zu/exec'
};
```

### vote-manager.html

**役割**: 投票管理機能のLIFFページ

**主要機能**:
- 新規投票作成
- 投票一覧表示
- 回答状況確認
- Google Formリンク共有

**common.js 使用例**:
```javascript
// LIFF初期化
const profile = await initLiff();

// GAS API呼び出し
const result = await callGAS('createVote', {
  title: '投票タイトル',
  targetGroup: '52代'
});

// UI操作
showLoading();
await someAsyncOperation();
hideLoading();
showAlert('投票を作成しました', 'success');
```

### gas/vote-manager.gs

**役割**: Google Apps Script バックエンド

**主要機能**:
- 投票作成（Google Form自動生成）
- 人員管理（学号ベースのグループ管理）
- 回答状況統計
- 投票一覧取得

**Spreadsheet構造**:

#### 投票管理シート（Master Sheet）
| 列 | 名前 | 説明 |
|----|------|------|
| A | 投票ID | 自動生成（タイムスタンプベース） |
| B | 投票タイトル | ユーザー入力 |
| C | 説明 | ユーザー入力 |
| D | フォームURL | 自動生成 |
| E | 回答URL | 自動生成 |
| F | ステータス | active/closed |
| G | 作成日時 | 自動記録 |
| H | 締切日時 | ユーザー入力（オプション） |
| I | 対象グループ | グループ名（例：52代） |

#### 人員管理シート
| 学号 | 姓名 | 50-52代 | 51-54代 | 执行部 | ... |
|------|------|---------|---------|--------|-----|
| C2578666 | 陶陶 | 1 | 1 | 0 | |
| 2151002 | 李四 | 1 | 0 | 1 | |
| 2251003 | 王五 | 0 | 1 | 0 | |

- A列: 学号（学生ID、主キー）
- B列: 姓名（名前）
- C列以降: グループ名（カスタマイズ可能）
- **1 = 所属**、**0 = 非所属**（数値で管理）

## 新機能追加ガイド

### ステップ1: ページマップに追加

[index.html](index.html) の `PAGE_MAP` に新しいページを追加:

```javascript
const PAGE_MAP = {
  'vote': './vote-manager.html',
  'attendance': './attendance-manager.html',
  'notice': './notice-manager.html',
  'newfeature': './newfeature-manager.html'  // 新機能
};
```

### ステップ2: HTMLページ作成

新しい機能のHTMLファイルを作成（例: `attendance-manager.html`）:

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>出勤管理</title>

  <!-- LIFF SDK -->
  <script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>

  <!-- 共通関数ライブラリ -->
  <script src="./js/common.js"></script>

  <style>
    /* スタイル定義 */
  </style>
</head>
<body>
  <div id="app">
    <!-- UIコンテンツ -->
  </div>

  <script>
    // ページ初期化
    async function init() {
      try {
        showLoading();

        // LIFF初期化（common.jsの関数を使用）
        const profile = await initLiff();
        if (!profile) return;

        // ページ固有の初期化処理
        await loadData();

        hideLoading();
      } catch (error) {
        console.error('初期化エラー:', error);
        showAlert('初期化に失敗しました', 'error');
      }
    }

    // データ読み込み
    async function loadData() {
      try {
        // callGAS を使用してバックエンドAPIを呼び出し
        const result = await callGAS('getAttendanceList', {});

        if (result.success) {
          renderData(result.data);
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        throw error;
      }
    }

    // データ描画
    function renderData(data) {
      // DOM操作でデータを表示
    }

    // ページロード時に初期化
    window.addEventListener('load', init);
  </script>
</body>
</html>
```

### ステップ3: GAS関数追加

[gas/vote-manager.gs](gas/vote-manager.gs) に新しいアクションを追加:

```javascript
function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var action = params.action;

  try {
    switch (action) {
      case 'createVote':
        return ContentService.createTextOutput(JSON.stringify(createVote(params)));

      // 新機能のアクション追加
      case 'getAttendanceList':
        return ContentService.createTextOutput(JSON.stringify(getAttendanceList(params)));

      case 'recordAttendance':
        return ContentService.createTextOutput(JSON.stringify(recordAttendance(params)));

      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }
}

// 新機能の関数実装
function getAttendanceList(params) {
  // 実装...
  return { success: true, data: [] };
}

function recordAttendance(params) {
  // 実装...
  return { success: true };
}
```

### ステップ4: Rich Menu設定

LINE Developers Consoleで Rich Menu を設定:

1. Rich Menu > Create を選択
2. ボタンを追加し、アクションタイプを「URI」に設定
3. URIに以下を入力:
   ```
   https://liff.line.me/2008292404-7kjGRzVn?page=attendance
   ```

## 開発のベストプラクティス

### 1. common.js を活用する

重複コードを避けるため、共通機能は必ず `common.js` を使用:

```javascript
// ❌ 悪い例: 各ページで個別にLIFF初期化
await liff.init({ liffId: '2008292404-7kjGRzVn' });
if (!liff.isLoggedIn()) {
  liff.login();
}

// ✅ 良い例: common.js の関数を使用
const profile = await initLiff();
```

### 2. エラーハンドリングを徹底

```javascript
async function someOperation() {
  try {
    showLoading();

    const result = await callGAS('someAction', {});

    if (result.success) {
      showAlert('成功しました', 'success');
    } else {
      throw new Error(result.error);
    }

  } catch (error) {
    console.error('操作エラー:', error);
    showAlert('エラーが発生しました: ' + error.message, 'error');

  } finally {
    hideLoading();
  }
}
```

### 3. XSS対策

ユーザー入力や外部データを表示する際は必ずエスケープ:

```javascript
// ❌ 悪い例
element.innerHTML = userInput;

// ✅ 良い例
element.textContent = userInput;
// または
element.innerHTML = escapeHtml(userInput);
```

### 4. デバッグログ活用

開発中は `debugLog()` を使用（本番環境では自動的に無効化）:

```javascript
debugLog('ユーザープロフィール:', profile);
debugLog('API応答:', result);
```

## セキュリティ考慮事項

### 公開情報 vs 秘密情報

**公開可能（GitHubにコミット可）**:
- LIFF ID: `2008292404-7kjGRzVn`
- GAS デプロイURL: `https://script.google.com/macros/s/.../exec`
- Spreadsheet ID: `1Xs6...`

**秘密情報（公開不可）**:
- Channel Secret
- Channel Access Token
- LINE Messaging API認証情報

### HTMLエスケープ

`common.js` の `escapeHtml()` 関数を使用してXSS攻撃を防止:

```javascript
const userName = escapeHtml(profile.displayName);
element.innerHTML = `ようこそ、${userName}さん`;
```

## デプロイ手順

### 1. GitHub Pagesデプロイ

```bash
git add .
git commit -m "Update feature"
git push origin main
```

GitHub Pages は自動的に更新されます。

### 2. GAS デプロイ

1. Google Apps Script エディタを開く
2. コードを更新
3. デプロイ > デプロイを管理 > 編集
4. バージョン: 新バージョン
5. デプロイ

### 3. LIFF Endpoint URL 設定

LINE Developers Console で以下を設定:

```
Endpoint URL: https://taotao3614.github.io/sophia_shorinji/
```

## トラブルシューティング

### ログインループ

**症状**: ログイン後、再度ログイン画面に戻る

**原因**: Endpoint URLの設定ミス

**解決策**: LINE Developers ConsoleでEndpoint URLを確認
- 正: `https://taotao3614.github.io/sophia_shorinji/`
- 誤: `https://taotao3614.github.io/sophia_shorinji/vote-manager.html`

### 400 エラー（invalid url）

**症状**: `liff.login()` で400エラー

**原因**: `redirectUri` パラメータが不要

**解決策**: `liff.login()` をパラメータなしで呼び出す
```javascript
// ❌ 悪い例
liff.login({ redirectUri: window.location.href });

// ✅ 良い例
liff.login();
```

### GAS でエラー

**症状**: `Unexpected error while getting the method`

**原因**: `const`/`let` の使用（古いランタイム）

**解決策**: すべて `var` に変更
```javascript
// ❌ 悪い例
const SHEET_ID = '...';

// ✅ 良い例
var SHEET_ID = '...';
```

## 今後の拡張計画

- [ ] 出勤管理機能
- [ ] お知らせ管理機能
- [ ] プッシュ通知機能
- [ ] 統計ダッシュボード
- [ ] ユーザー権限管理

## 参考資料

- [LIFF v2 Documentation](https://developers.line.biz/ja/docs/liff/)
- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)

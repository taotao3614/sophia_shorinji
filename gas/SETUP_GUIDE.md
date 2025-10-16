# Google Apps Script セットアップガイド

## 📋 ステップ1: Master Google Sheet を作成

### 1.1 新しいスプレッドシートを作成
1. [Google Sheets](https://sheets.google.com/) にアクセス
2. 「空白」をクリックして新しいスプレッドシートを作成
3. シート名を **「投票管理マスター」** に変更

### 1.2 シートIDを取得
- URLから**スプレッドシートID**をコピー:
  ```
  https://docs.google.com/spreadsheets/d/[このIDをコピー]/edit
  https://docs.google.com/spreadsheets/d/1JwaHy2_WZzHCFMhJTr-I9_oeCQwq9h4EQTde-9eE9Fg/edit
  ```
- id: `1JwaHy2_WZzHCFMhJTr-I9_oeCQwq9h4EQTde-9eE9Fg`

### 1.3 シート構造（自動生成されます）
初回実行時に以下のヘッダーが自動作成されます:

| A列 | B列 | C列 | D列 | E列 | F列 | G列 | H列 |
|-----|-----|-----|-----|-----|-----|-----|-----|
| 投票ID | 投票タイトル | 投票説明 | 作成日時 | 締切日時 | Google Form URL | ステータス | 回答数 |

---

## 🔧 ステップ2: Google Apps Script を設定

### 2.1 Apps Script エディタを開く
1. 作成したスプレッドシートを開く
2. メニューバー: **拡張機能** → **Apps Script**
3. 新しいタブでApps Scriptエディタが開きます

### 2.2 スクリプトをコピー＆ペースト
1. デフォルトの `Code.gs` の内容を全て削除
2. `gas/vote-manager.gs` の内容を全てコピー
3. Apps Scriptエディタにペースト

### 2.3 スプレッドシートIDを設定
スクリプトの **3行目** を編集:

```javascript
const MASTER_SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
```

↓ 実際のIDに置き換え:

```javascript
const MASTER_SHEET_ID = '1ABCdefGHIjklMNOpqrSTUvwxYZ1234567890';
```

### 2.4 保存
- **Ctrl+S** または **ファイル** → **保存**
- プロジェクト名: 「投票管理システム」

---

## 🚀 ステップ3: Web App としてデプロイ

### 3.1 デプロイを開始
1. 右上の **デプロイ** ボタンをクリック
2. **新しいデプロイ** を選択

### 3.2 デプロイ設定
1. **種類の選択**: ⚙️アイコンをクリック → **ウェブアプリ** を選択
2. **説明**: 「投票管理API v1」（任意）
3. **次のユーザーとして実行**: **自分**（あなたのGoogleアカウント）
4. **アクセスできるユーザー**: **全員**（⚠️ テスト段階のみ推奨）

### 3.3 デプロイを実行
1. **デプロイ** ボタンをクリック
2. **アクセスを承認** をクリック
3. Googleアカウントでログイン
4. ⚠️ 「このアプリは確認されていません」が表示されたら:
   - **詳細** → **（プロジェクト名）に移動（安全ではありません）** をクリック
5. **許可** をクリック

### 3.4 Web App URL を取得
デプロイ完了後、以下のようなURLが表示されます:

```
https://script.google.com/macros/s/AKfycbyXXXXXXXXXXXXXXXXX/exec
```

このURLを **コピー** してください！

---

## ⚙️ ステップ4: config.json を更新

### 4.1 config.json を編集
`config/config.json` を開き、以下を追加:

```json
{
  "liffId": "既存の値",
  "channelAccessToken": "既存の値",
  "voteMasterSheetId": "YOUR_SPREADSHEET_ID",
  "voteManagerGasUrl": "https://script.google.com/macros/s/AKfycbyXXXXXX/exec"
}
```

**設定する値:**
- `voteMasterSheetId`: ステップ1.2で取得したスプレッドシートID
- `voteManagerGasUrl`: ステップ3.4で取得したWeb App URL

---

## 🧪 ステップ5: テスト実行

### 5.1 Apps Script エディタでテスト
1. Apps Scriptエディタに戻る
2. 上部のドロップダウンメニューから **testCreateVote** を選択
3. **実行** ボタン（▶️）をクリック
4. **実行ログ** を確認（下部のパネル）

✅ 成功すると以下のような結果が表示されます:
```json
{
  "success": true,
  "voteId": "VOTE_1234567890_123",
  "formUrl": "https://docs.google.com/forms/d/e/XXXXX/viewform"
}
```

### 5.2 スプレッドシートを確認
- 「投票管理」シートに新しい行が追加されているか確認
- Google Formが自動作成されているか確認

### 5.3 Web App URLをブラウザで確認
取得したWeb App URLをブラウザで開く:

```
https://script.google.com/macros/s/AKfycbyXXXXXX/exec
```

✅ 以下のようなJSONが表示されればOK:
```json
{
  "status": "ok",
  "message": "投票管理システムAPI - POST /exec を使用してください",
  "timestamp": "2025-01-15T12:34:56.789Z"
}
```

---

## 🔒 セキュリティ注意事項

### ⚠️ 本番環境への移行時の推奨設定

現在の設定（アクセスできるユーザー: **全員**）はテスト用です。

**本番環境では以下を推奨:**

#### オプション1: LIFF経由の制限（推奨）
- LIFF内でユーザー認証を行い、認証済みユーザーのみAPI呼び出しを許可
- GAS側でLINE User IDを検証する仕組みを追加

#### オプション2: 固定トークン認証
GASスクリプトに以下を追加:

```javascript
const API_TOKEN = 'your-secret-token-here';

function doPost(e) {
  const params = JSON.parse(e.postData.contents);

  // トークン検証
  if (params.token !== API_TOKEN) {
    return createJsonResponse({
      success: false,
      error: '認証エラー'
    });
  }

  // 以降の処理...
}
```

---

## 📝 トラブルシューティング

### エラー: "Exception: Unexpected error while getting the method or property..."
- **原因**: スプレッドシートIDが間違っている
- **対処**: `MASTER_SHEET_ID` を確認

### エラー: "We're sorry, a server error occurred."
- **原因**: デプロイ時の権限設定が不完全
- **対処**: デプロイをやり直す（ステップ3を再実行）

### Google Formが作成されない
- **原因**: Google Drive APIの権限不足
- **対処**: Apps Scriptエディタで初回実行時に全ての権限を許可

### Web App URLにアクセスできない
- **原因**: デプロイ設定が間違っている
- **対処**:
  - 「アクセスできるユーザー」が「全員」になっているか確認
  - 古いデプロイを削除して再デプロイ

---

## ✅ 完成チェックリスト

- [ ] Google Sheetsで「投票管理マスター」スプレッドシートを作成
- [ ] スプレッドシートIDを取得
- [ ] Apps Scriptエディタで `vote-manager.gs` をコピー＆ペースト
- [ ] `MASTER_SHEET_ID` を実際のIDに置き換え
- [ ] Web Appとしてデプロイ
- [ ] Web App URLを取得
- [ ] `config/config.json` にIDとURLを設定
- [ ] `testCreateVote()` を実行してテスト成功
- [ ] Web App URLにアクセスしてJSON応答を確認

---

**次のステップ**: LIFF前端（vote-manager.html）の作成 →

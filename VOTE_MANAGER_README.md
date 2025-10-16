# 投票管理システム - 使用ガイド

## 📖 概要

このシステムは、LINE OAを通じて投票・アンケートを簡単に作成・管理できる内部管理ツールです。

### 主な機能
- ✅ LIFF画面から直接投票を作成
- ✅ Google Formの自動生成
- ✅ 進行中/過去の投票一覧表示
- ✅ 投票の締切自動判定
- ✅ 上智大学赤色テーマのデザイン

---

## 🏗️ システム構成

```
LIFF前端 (vote-manager.html)
         ↓ HTTP POST
Google Apps Script (Web App)
         ↓
Master Google Sheet (投票管理表)
         ↓ Forms API
Google Forms (各投票フォーム)
```

### 使用技術
- **フロントエンド**: HTML, CSS, JavaScript, LINE LIFF SDK
- **バックエンド**: Google Apps Script
- **データストレージ**: Google Sheets
- **フォーム**: Google Forms
- **ホスティング**: GitHub Pages

---

## 🚀 セットアップ手順

### ステップ1: Google Sheet と GAS の設定

詳細は [gas/SETUP_GUIDE.md](gas/SETUP_GUIDE.md) を参照してください。

**概要:**
1. Google Sheetsで「投票管理マスター」を作成
2. スプレッドシートIDを取得
3. Apps Scriptエディタで `gas/vote-manager.gs` を設定
4. Web Appとしてデプロイ
5. Web App URLを取得

### ステップ2: config.json の更新

`config/config.json` に以下を追加:

```json
{
  "liffId": "既存の値",
  "channelAccessToken": "既存の値",
  "voteMasterSheetId": "YOUR_SPREADSHEET_ID",
  "voteManagerGasUrl": "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
}
```

**設定項目:**
- `voteMasterSheetId`: Google SheetsのスプレッドシートID
- `voteManagerGasUrl`: GAS Web AppのデプロイURL

### ステップ3: GitHub Pages にデプロイ

```bash
git add .
git commit -m "Add vote manager system"
git push origin main
```

数分後、以下のURLでアクセス可能:
```
https://YOUR_GITHUB_USERNAME.github.io/sophia_shorinji/vote-manager.html
```

### ステップ4: LIFF URL の取得

LIFFアプリのURLは以下の形式:
```
https://liff.line.me/YOUR_LIFF_ID/vote-manager.html
```

このURLをRich Menuのボタンに設定してください。

---

## 💻 使い方

### 管理者向け - 投票を作成する

1. LINE OAのRich Menuから「投票管理」ボタンをタップ
2. LIFF画面が開く
3. 「新規投票を作成」ボタンをタップ
4. 投票情報を入力:
   - **投票タイトル** (必須): 例「2月合宿の参加調査」
   - **投票説明** (任意): 詳細や注意事項
   - **選択肢** (必須・2つ以上): 例「参加する」「不参加」「検討中」
   - **締切日時** (任意): 例「2025-02-28」
5. 「作成する」ボタンをクリック
6. Google Formが自動作成され、投票リストに追加されます

### 管理者向け - 投票を確認する

1. LIFF画面で投票リストを表示
2. 投票カードをタップするとGoogle Formが開きます
3. Google Formの「回答」タブで結果を確認

### 部員向け - 投票に回答する

1. 管理者がLINEグループに投票URLを共有
2. URLをタップしてGoogle Formを開く
3. 選択肢を選んで送信

---

## 📊 データ構造

### Master Google Sheet

| 列 | 項目名 | 説明 | 例 |
|----|--------|------|-----|
| A | 投票ID | 自動生成 | VOTE_1234567890_123 |
| B | 投票タイトル | 投票の名前 | 2月合宿の参加調査 |
| C | 投票説明 | 詳細説明 | 2月20-22日の合宿について |
| D | 作成日時 | ISO形式 | 2025-01-15T12:34:56.789Z |
| E | 締切日時 | YYYY-MM-DD | 2025-02-15 |
| F | Google Form URL | 自動生成 | https://forms.gle/xxxx |
| G | ステータス | active/expired | active |
| H | 回答数 | 回答者数 | 12 |

### GAS API エンドポイント

#### 1. 投票を作成

**リクエスト:**
```json
{
  "action": "createVote",
  "title": "投票タイトル",
  "description": "投票説明",
  "options": ["選択肢1", "選択肢2", "選択肢3"],
  "deadline": "2025-12-31"
}
```

**レスポンス:**
```json
{
  "success": true,
  "voteId": "VOTE_1234567890_123",
  "formUrl": "https://docs.google.com/forms/d/e/xxxxx/viewform",
  "formId": "1ABCdefGHI...",
  "message": "投票を作成しました"
}
```

#### 2. 投票リストを取得

**リクエスト:**
```json
{
  "action": "listVotes"
}
```

**レスポンス:**
```json
{
  "success": true,
  "votes": [
    {
      "voteId": "VOTE_1234567890_123",
      "title": "2月合宿の参加調査",
      "description": "2月20-22日の合宿について",
      "createdAt": "2025-01-15T12:34:56.789Z",
      "deadline": "2025-02-15",
      "formUrl": "https://forms.gle/xxxx",
      "status": "active",
      "responseCount": 12
    }
  ],
  "count": 1
}
```

#### 3. 投票詳細を取得

**リクエスト:**
```json
{
  "action": "getVoteDetails",
  "voteId": "VOTE_1234567890_123"
}
```

**レスポンス:**
```json
{
  "success": true,
  "vote": {
    "voteId": "VOTE_1234567890_123",
    "title": "2月合宿の参加調査",
    "description": "2月20-22日の合宿について",
    "createdAt": "2025-01-15T12:34:56.789Z",
    "deadline": "2025-02-15",
    "formUrl": "https://forms.gle/xxxx",
    "status": "active",
    "responseCount": 12
  }
}
```

---

## 🎨 デザイン仕様

### カラーパレット（赤色テーマ）

```css
--accent-red: #b8282d      /* メインカラー（ヘッダー、ボタン） */
--accent-gold: #c9a961     /* アクセントカラー（ヘッダー下線） */
--sophia-blue: #32373c     /* テキストカラー */
--sophia-gray: #abb8c3     /* グレー */
```

### UI コンポーネント

- **ヘッダー**: 赤色背景、金色の下線
- **カード**: 白背景、赤色の左ボーダー
- **ボタン**: 赤色背景、ホバー時に暗赤色
- **モーダル**: 中央表示、フェードイン/スライドダウン
- **投票カード**: クリック可能、ホバー時に右にスライド

---

## 🔧 カスタマイズ

### 投票の選択肢を増やす

デフォルトでは2つの選択肢入力欄が表示されます。「+ 選択肢を追加」ボタンで無制限に追加可能。

### 締切の自動判定

GASスクリプトの `listVotes()` 関数が自動的に締切をチェックし、過ぎた投票を「expired」に変更します。

### カラーテーマの変更

`vote-manager.html` の `<style>` タグ内で色を変更:

```css
.header {
  background: var(--accent-red); /* ここを変更 */
}
```

---

## 📱 Rich Menu 設定

### 推奨レイアウト

```
┌─────────────────────┐
│                     │
│   📋 投票管理       │
│                     │
├──────────┬──────────┤
│ ℹ️ ヘルプ │ ⚙️ 設定  │
└──────────┴──────────┘
```

### リンク設定

- **投票管理**: `https://liff.line.me/YOUR_LIFF_ID/vote-manager.html`
- **ヘルプ**: テキストメッセージを返信
- **設定**: `https://liff.line.me/YOUR_LIFF_ID/settings.html`

---

## 🐛 トラブルシューティング

### エラー: "GAS URLが設定されていません"

**原因**: `config.json` に `voteManagerGasUrl` が設定されていない

**対処**:
1. `config/config.json` を開く
2. `voteManagerGasUrl` を追加
3. ファイルを保存してGitHubにプッシュ

### エラー: "投票リストの取得に失敗しました"

**原因**: GAS Web AppのURLが間違っているか、デプロイされていない

**対処**:
1. GASエディタでデプロイ状況を確認
2. Web App URLが正しいか確認
3. GASの「アクセスできるユーザー」が「全員」になっているか確認

### 投票が作成されない

**原因**: GASのスプレッドシートIDが間違っている

**対処**:
1. `gas/vote-manager.gs` の `MASTER_SHEET_ID` を確認
2. スプレッドシートのURLからIDをコピーして再設定
3. GASを再保存してテスト実行

### LIFF画面が開かない

**原因**: LIFF IDが間違っているか、エンドポイントURLが設定されていない

**対処**:
1. LINE Developers コンソールでLIFF設定を確認
2. Endpoint URLに `https://YOUR_GITHUB_USERNAME.github.io/sophia_shorinji/vote-manager.html` を設定
3. LIFF IDが `config.json` に正しく設定されているか確認

---

## 🔐 セキュリティ

### 現在の設定（テスト環境）

- GAS Web App: **全員アクセス可能**
- Google Sheet: **閲覧制限あり**（あなたのGoogleアカウントのみ）
- LIFF: **LINE認証済みユーザーのみ**

### 本番環境への推奨事項

1. **認証トークンの追加**
   - LIFF内でLINE User IDを取得
   - GAS APIリクエストにUser IDを含める
   - GAS側でUser IDを検証

2. **アクセス制限**
   - 許可されたUser IDのリストを作成
   - リストにないユーザーはエラーを返す

3. **CORS設定**
   - 特定のオリジンからのみAPIアクセスを許可

---

## 📈 今後の拡張案

### 優先度: 高
- [ ] 投票結果のグラフ表示
- [ ] 投票の編集・削除機能
- [ ] 回答数のリアルタイム更新

### 優先度: 中
- [ ] 投票の公開/非公開設定
- [ ] 複数選択/単一選択の設定
- [ ] 投票終了時の自動通知

### 優先度: 低
- [ ] 投票テンプレート機能
- [ ] 投票のコピー機能
- [ ] 回答者の一覧表示

---

## 📞 サポート

問題が発生した場合:

1. `gas/SETUP_GUIDE.md` のトラブルシューティングを確認
2. GASエディタの「実行ログ」を確認
3. ブラウザの開発者ツール（F12）でエラーログを確認
4. GitHub Issuesで報告

---

## 📝 ライセンス

このプロジェクトは上智大学少林寺拳法部の内部ツールです。

---

**開発者**: Claude Code
**最終更新**: 2025年1月15日

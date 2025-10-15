# 上智大学少林寺拳法部 LINE OA システム

## プロジェクト概要
本プロジェクトは、上智大学少林寺拳法部のLINE公式アカウント（OA）を活用した部員管理システムです。

### 主要機能
- 出欠表リンク統合
- 投票・日程調整
- 資料参照ディレクトリ
- 外部来訪申請
- リッチメニュー構成

## 技術スタック
- **LIFF (LINE Front-end Framework)**: フロントエンドUI
- **Google Forms**: 投票・申請フォーム
- **Google Sheets**: データ集計
- **Google Apps Script**: 自動返信処理
- **GitHub Pages**: 静的ホスティング
- **LINE Messaging API**: 1対1自動返信（無料枠のみ）

## ディレクトリ構成
```
sophia_shorinji_line_oa/
├── liff/                 # LIFFアプリケーション
│   ├── index.html       # メインページ
│   ├── vote.html        # 投票・日程調整ページ
│   ├── materials.html   # 資料参照ページ
│   ├── apply.html       # 外部申請ページ
│   ├── css/            # スタイルシート
│   ├── js/             # JavaScript
│   ├── images/         # 画像リソース
│   └── config/         # 設定ファイル
├── gas/                 # Google Apps Script
│   └── auto-reply.gs   # 自動返信スクリプト
└── docs/               # ドキュメント
    └── setup-guide.md  # セットアップガイド
```

## セットアップ手順

### 1. LINE Developers設定
1. [LINE Developers Console](https://developers.line.biz/) にアクセス
2. Messaging APIチャネルを作成
3. Channel Access Tokenを取得
4. Webhook設定（後で使用）

### 2. LIFF アプリ登録
1. LINE Developersコンソールで「LIFF」タブを開く
2. 「追加」ボタンをクリック
3. LIFF IDを取得（後でコードに記入）

### 3. GitHub Pages デプロイ
1. GitHubリポジトリを作成
2. `liff/`フォルダの内容をプッシュ
3. Settings > Pages でGitHub Pagesを有効化
4. デプロイされたURLをLIFF Endpoint URLに設定

### 4. Google Forms 作成
1. 投票用フォームを作成
2. 外部申請用フォームを作成
3. 各フォームのURLを記録

### 5. Google Apps Script 設定
1. Google FormsからApps Scriptエディタを開く
2. `gas/auto-reply.gs`のコードをコピー
3. LINE Channel Access Tokenを設定
4. トリガーを設定（フォーム送信時）

### 6. リッチメニュー設定
1. LINE Official Account Managerにアクセス
2. リッチメニューを作成（5ボタン構成）
3. 各ボタンにLIFF URLを設定

## 運用方針
- **コスト**: 完全無料（無料枠サービスのみ使用）
- **メッセージ配信**: 手動共有中心（`liff.shareTargetPicker()`）
- **自動返信**: 外部申請のみ（月間200-500通以内）
- **データ管理**: Googleサービスで完結

## ライセンス
本プロジェクトは上智大学少林寺拳法部の内部利用を目的としています。

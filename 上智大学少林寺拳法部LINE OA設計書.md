# **第1章　背景と目的（背景与目的）**

## **1.1　背景**

上智大学少林寺拳法部は、部員間の連絡・出欠管理・資料共有などを主にLINEグループおよびGoogleスプレッドシート／フォームを用いて運営している。  
 現状の運営体制は基本的に機能しているものの、情報が複数のツールに分散しており、  
 内部・外部双方に対するアクセス導線が煩雑になりつつある。  
 また、今後は新入生勧誘や他大学との合同稽古など、外部との接点が増えることが想定されるため、  
 LINE公式アカウント（以下、LINE OA）を中心とした一元的な窓口の整備が求められている。

---

## **1.2　目的**

本プロジェクトの目的は、少林寺拳法部専用のLINE OAを構築し、以下の三つの目標を実現することである。

1. **内部管理の利便性向上**  
    　既存のGoogleスプレッドシート等を維持したまま、OA上から直接アクセスできる導線を整備する。  
    　（※当面はリンク連携のみを想定し、LIFF等による機能拡張は将来的検討事項とする）

2. **外部アクセスの整備**  
    　他大学や一般来訪者からの申請をOA経由で受付し、管理者への通知・承認フローを整備する。

3. **将来的な拡張性の確保**  
    　新入生勧誘・広報活動（イベント告知、SNS連携など）への拡張を視野に入れる。

---

## **1.3　現状の課題**

| 項目 | 現状 | 課題点 |
| ----- | ----- | ----- |
| 出欠管理 | Googleスプレッドシートで円滑に運用中 | 課題なし。OA上から安全にリンクを提供するのみ |
| 投票・日程調整 | GoogleフォームやPythonスクリプトを都度作成 | 作成・共有の手間がかかる。OA上で投票作成と配信を可能にしたい |
| 資料共有 | SNSリンクや動画URLを都度送付 | 情報が散在し、履歴管理が難しい。OAからカテゴリ別に参照できるようにしたい |
| 外部連絡 | 個別チャット・メールなどで対応 | 統一窓口が存在せず、対応漏れリスクがある。OA経由で受付・通知を行いたい |

---

## **1.4　対象ユーザー（想定利用者）**

| 区分 | 説明 | 主な利用目的 | 主な利用チャネル |
| ----- | ----- | ----- | ----- |
| A. 社団内部部員 | 現役部員・幹部 | 出欠確認、資料参照、投票 | LINE |
| B. 新入部員（大一生） | 新規参加希望者 | 入部案内、活動紹介 | LINE / Instagram |
| C. 校外関係者 | 他大学・OB・見学者等 | 来訪申請、連絡窓口 | LINE / Instagram |

---

## **1.5　本章まとめ**

本要件定義書は、上記目的を実現するための**機能要件・非機能要件・運用方針**を明確化し、  
開発および運用フェーズにおける判断基準を提供することを目的とする。

# **第2章　システム概要・スコープ定義**

## **2.1　システム概要**

本システムは、**LINE公式アカウント（以下、LINE OA）** を基盤とし、  
 内部部員および外部関係者とのコミュニケーションを**低コストかつ効率的**に行うことを目的としたものである。

本プロジェクトでは、**サーバーを新設せず**、主に以下の技術構成を採用する：

* **LIFF（LINE Front-end Framework）**：LINE内ブラウザで動作するフロントエンド（HTML/JavaScript）アプリ

* **Googleサービス（Forms / Sheets / Drive）**：データ収集・集計・資料管理の基盤

* **Google Apps Script（GAS）**：軽量な自動処理・API連携用のスクリプト実行環境

* **Messaging API（無料枠内のみ利用）**：申請受付などにおける1対1の返信通知限定で使用

メッセージの拡散は**管理者による手動共有**（`liff.shareTargetPicker()`）を基本とし、  
 **自動送信や定時配信、Botによる群発送信は行わない**。

---

## **2.2　本開発スコープ（In Scope）**

1. **出欠表リンク統合**  
    　既存のGoogleスプレッドシートを維持し、LINE OA上のボタンまたはメニューから  
    　直接アクセスできるリンクを設置する。  
    　アクセス制御はGoogle側の権限設定に依存し、LIFF側では認証処理を行わない。

2. **投票・日程調整（LIFF＋手動共有）**  
    　- 管理者はLIFFページ上で投票フォーム（Google Form）を作成または選択できる。  
    　- 作成後、`liff.shareTargetPicker()`を利用し、管理者本人のアカウントとして  
    　　対象グループやメンバーに手動で共有する。  
    　- 回答結果はGoogleシートで自動集計し、LIFFページ上からもリンクで参照可能とする。

3. **資料参照（コンテンツディレクトリ機能）**  
    　- LIFF上にカテゴリ別の資料リストを設け、各項目からYouTube／Instagram／Google Drive等への  
    　　リンクまたはテキスト情報を表示する。  
    　- データ構成はフロントエンドのJSONファイルで管理し、非開発者でも内容を更新可能とする。

4. **外部来訪申請フォーム連携**  
    　- LIFF内から「来訪申請」ボタンを設け、Google Formへ遷移。  
    　- 申請内容はGoogleシートに記録され、GAS経由で申請者に自動返信メッセージを送信（Messaging API使用）。  
    　- 自動返信は1対1メッセージのみとし、無料枠内で運用する。

5. **LINE OAナビゲーション設計**  
    　- リッチメニューに以下の主要機能を配置する：  
    　　出欠表／投票・日程調整／資料参照／外部申請／連絡先情報  
    　- キーワード応答（例：「出欠」「投票」「資料」）により、該当リンクを返す自動応答設定を行う。

---

## **2.3　非スコープ（Out of Scope）**

* サーバー／データベースの新規構築

* Botによる自動・定時配信、群発メッセージ送信

* LINE OA内での認証・権限管理機能（アクセス制御はGoogle側で実施）

* 独自の統計・分析機能（集計はGoogleシート／グラフを使用）

* メンバー管理や承認ワークフロー（フォーム結果をもとに手動処理）

---

## **2.4　システム構成・外部連携**

### **（1）構成概要**

| コンポーネント | 役割 | 備考 |
| ----- | ----- | ----- |
| **LINE OA** | ユーザー接点、リッチメニュー・応答制御 | 無料プラン利用 |
| **LIFFアプリ** | UI・投票作成・資料参照・共有操作 | HTML/JSのみ、静的ホスティング（GitHub Pages等） |
| **Google Forms** | 投票・来訪申請の入力フォーム | 無料枠利用 |
| **Google Sheets** | 回答結果の保存・集計 | GASと連携 |
| **Google Apps Script** | 軽量処理（フォーム受信→返信、API連携） | 無料枠で動作 |
| **Messaging API** | 申請受付時の1対1自動返信 | 無料枠内（上限200〜500通/月）に制御 |

### **（2）メッセージ送信方針**

* **手動共有**：`liff.shareTargetPicker()`を利用し、管理者が任意にグループへ送信（無料）。

* **自動返信（個別）**：GAS \+ Messaging APIを用いて、フォーム送信者に対して確認メッセージを送信。

* **制限設定**：  
   　1. BroadcastやPush送信は禁止。  
   　2. 1対1返信のみ許可。  
   　3. GAS上で送信カウンタを保持し、上限の80％到達時に送信停止。  
   　4. 実際の上限値はLINE OA管理画面で確認（地域により200〜500通/月）。

---

## **2.5　将来拡張（Future Options）**

* Messaging API＋GASによる**自動／定時配信機能**

* Bot参加型の**グループ内アンケート**

* CMS化した資料管理バックエンド

* **メンバー認証／学籍連携機能**（Sophiaメールアドレスによるアクセス制御）

* 募集イベント専用モジュール（申込→承認→記録）

* 活動分析／KPIダッシュボード（出欠率・投票参加率等）

---

## **2.6　制約条件・既知リスク**

| 区分 | 内容 |
| ----- | ----- |
| 成果物コスト | 全て無料枠サービス内で構成。サーバー費用は発生しない。 |
| メッセージ配信 | 無料枠超過時は自動返信が停止する。 |
| 権限管理 | Google側に依存。LINE OA側では制御不可。 |
| データ分散 | 出欠表・資料・投票結果が異なるGoogleサービス上に分散するため、運用上の整理が必要。 |
| ブラウザ制約 | LIFFはLINE内ブラウザで実行されるため、一部埋め込みメディアが正常表示されない可能性がある。 |

---

### **本章まとめ**

本章では、少林寺拳法部LINE OAの開発スコープを\*\*「サーバーレス・低コスト・手動共有を前提とした最小実用構成」\*\*として定義した。  
 GASおよびMessaging APIは補助的に活用し、運用コストを最小限に抑えつつ、  
 必要な自動処理（申請受付通知など）を実現する設計方針とする。

## **第3章　機能要件定義（Functional Requirements）**

### **3.1　基本方針**

本章では、第2章で定義したスコープに基づき、  
 少林寺拳法部LINE OAに実装すべき具体的機能要件を明確化する。  
 すべての機能は以下の基本方針に従うものとする。

* **コスト最小化**：有料API・外部サーバーを利用せず、無料枠サービスのみで構成する。

* **運用簡易化**：管理者（学生幹部）が非技術者でも更新・配信できる構成とする。

* **手動共有中心**：メッセージ配信は管理者による手動操作を基本とする。

* **安全性確保**：Google認証設定による閲覧制御を行い、OA側では個人情報を保持しない。

---

### **3.2　機能一覧**

| No | 機能名称 | 概要 | 利用技術 | 備考 |
| ----- | ----- | ----- | ----- | ----- |
| F-01 | 出欠表リンク統合 | OAリッチメニューまたはキーワード応答からGoogleスプレッドシートへ遷移 | LIFFリンク | Googleシート側でアクセス制御 |
| F-02 | 投票／日程調整作成・共有 | LIFF内でフォームを選択・新規作成し、shareTargetPickerでグループ共有 | LIFF \+ Google Form | 自動集計はSheetsで実施 |
| F-03 | 資料参照ディレクトリ | カテゴリ別に動画・SNS・Drive等を表示するページ | LIFF \+ JSONデータ | JSONをGoogle DriveまたはGitHub上に配置 |
| F-04 | 外部来訪申請受付 | 来訪フォーム入力→自動返信→管理者通知 | Google Form \+ GAS \+ Messaging API | 自動返信は1対1のみ |
| F-05 | リッチメニュー構成 | 主要5機能をボタン化し、LINE内から操作可能 | LINE OA管理画面 | 出欠／投票／資料／申請／連絡先 |
| F-06 | キーワード応答設定 | 「出欠」「投票」「資料」などの語句で対応リンクを返す | LINE OA自動応答機能 | 固定リンク形式で対応 |
| F-07 | 通知管理（送信上限制御） | GASで送信数カウントし、上限超過時に停止 | GAS \+ Messaging API | 上限80％到達で自動ブロック |
| F-08 | 管理者設定ページ（簡易） | JSONリンク・フォームID等の設定を更新可能 | LIFF | 非開発者でも編集可能な構造 |

---

### **3.3　機能詳細**

#### **(1) 出欠表リンク統合（F-01）**

* リッチメニューおよびキーワード応答から、既存のGoogleスプレッドシートへ直接アクセス。

* シート側の閲覧権限はGoogleアカウントにより制御。

* LIFFアプリは単に安全な遷移リンクを提供し、データを保持しない。

#### **(2) 投票・日程調整（F-02）**

* 管理者はLIFF上からGoogleフォームのURLを登録または作成。

* 投票作成後、`liff.shareTargetPicker()` を用いてグループに共有。

* 回答はGoogleシートに自動集計され、LIFFページ上から閲覧リンクを参照可能。

#### **(3) 資料参照ディレクトリ（F-03）**

* LIFF上にカテゴリ（例：技術動画／稽古予定／広報資料）をタブ表示。

* 各項目はJSONファイルから動的に読み込み、YouTube／Instagram／Drive等に遷移。

* JSON更新はGoogle Drive／GitHub Pages経由で行い、手動で反映。

#### **(4) 外部来訪申請（F-04）**

* フォーム入力→Googleシート保存→GASでトリガー実行。

* GASはMessaging APIを呼び出し、申請者に確認メッセージを自動返信。

* 返信文面は「申請ありがとうございました。担当者より追ってご連絡します。」など定型文。

#### **(5) リッチメニュー構成（F-05）**

* ボタン例：  
   　① 出欠表  
   　② 投票・日程調整  
   　③ 資料参照  
   　④ 外部申請  
   　⑤ 連絡先情報

* メニュー画像はCanva等で作成し、リンクはLIFFまたはフォームURLを指定。

#### **(6) 自動応答設定（F-06）**

* OA管理画面の「応答メッセージ」機能を利用。

* 登録キーワードと返信文例：  
   　- 「出欠」→「出欠表はこちら：https://〜」  
   　- 「投票」→「最新の投票はこちら：https://〜」  
   　- 「資料」→「活動資料はこちら：https://〜」

#### **(7) GASによる通知制御（F-07）**

* GASスクリプトで送信回数を変数に記録。

* 上限の80％到達時に自動返信処理を停止し、管理者に警告メール送信。

#### **(8) 管理者設定ページ（F-08）**

* LIFFページ上に設定フォームを設け、JSONの更新・再読込が可能。

* JSONはGitHub Pages等でホスティングし、変更を即時反映。

---

### **3.4　非機能要件（抜粋）**

| 区分 | 要件内容 |
| ----- | ----- |
| 性能 | 通常アクセス時（同時10人以下）で1秒以内のページ応答 |
| 可用性 | Googleサービスの稼働に依存（OA側での補償なし） |
| 保守性 | JSON・Googleフォーム更新のみで運用維持可能 |
| セキュリティ | 個人情報はGoogleフォーム側で暗号化／OAには保持しない |
| 拡張性 | 第2章で定義した「将来拡張」に対応可能な設計構成 |

---

### **3.5　本章まとめ**

本章では、少林寺拳法部LINE OAの最小実用構成における8つの主要機能を定義した。  
 各機能は既存のGoogleサービスおよびLINE標準機能の組合せにより実現可能であり、  
 追加費用を発生させることなく、管理者の運用負担を最小化する設計とする。

# **第4章　UI・処理設計概要（LIFF＋Google連携）**

## **4.1　設計方針**

本システムは、**LINE公式アカウント（OA）を起点としたサーバーレス構成**を採用し、  
 LIFF（LINE Front-end Framework）とGoogleサービスを組み合わせて、  
 部内連絡・投票・資料共有・外部申請の主要業務を低コストで実現する。

* **フロントエンド中心**：LIFFを用い、管理者が投票や資料を作成・選択し、shareTargetPickerで任意のグループへ共有。

* **データ管理**：Google Form／Sheet／Driveで実施し、OA側には個人情報を保持しない。

* **自動応答の最小化**：自動返信は外部申請のみで使用し、Messaging API無料枠内に制御。

---

## **4.2　主要機能と操作イメージ**

| 区分 | 操作主体 | 主な操作 | 使用機能 | 備考 |
| ----- | ----- | ----- | ----- | ----- |
| 出欠表参照 | 部員 | リッチメニューからスプレッドシートを開く | OAリンク機能 | Google権限依存 |
| 投票・日程調整 | 管理者→部員 | LIFFでForm作成→共有→部員回答 | LIFF＋Google Form | 自動集計はSheets |
| 資料共有 | 管理者→部員 | LIFFで資料選択→共有→部員閲覧 | LIFF＋Drive／YouTube | JSON管理構造 |
| 外部申請 | 外部者 | LIFFでForm入力→GAS自動返信 | Form＋GAS＋Messaging API | 1対1返信のみ |
| 連絡先表示 | 部員 | SNS・メール案内を閲覧 | LIFF静的ページ | 定期更新可 |

---

## **4.3　処理フロー（全体構成）**

![][image1]  
`graph LR`  
    `A[管理者: LIFF] -->|shareTargetPicker| B[LINE OA トーク／グループ]`  
    `B -->|リンククリック| C[LIFF 各画面]`  
    `C -->|Googleフォーム入力| D[Google Form]`  
    `D -->|回答保存| E[Google Sheet]`  
    `D -->|onFormSubmit| F[GAS]`  
    `F -->|自動返信| G[Messaging API]`  
    `G -->|1対1メッセージ| H[申請者]`  
    `C -->|資料参照| I[Google Drive／YouTube]`

**説明：**

1. 管理者はLIFF内でリンク（フォーム／資料）を作成または選択し、共有パネルから対象グループへ送信。

2. 部員や外部者は共有リンクをクリックし、GoogleフォームまたはDriveへ遷移。

3. フォーム送信時にはGASが起動し、Messaging API経由で自動返信を実行（無料枠内）。

---

## **4.4　投票・日程調整シナリオ（代表例）**

![][image2]  
`sequenceDiagram`  
    `participant 管理者 as 管理者(LIFF)`  
    `participant グループ as LINEグループ`  
    `participant 部員 as 部員`  
    `participant GForm as Googleフォーム`  
    `participant GSheet as Googleシート`

    `管理者->>GForm: 新しいフォームを作成`  
    `管理者->>グループ: shareTargetPickerでリンク共有`  
    `部員->>GForm: 回答入力・送信`  
    `GForm->>GSheet: 回答保存・自動集計`  
    `管理者->>GSheet: 結果確認`

**特徴：**

* LIFF内の「投票作成」ボタンからGoogle Formを開き、そのまま新規作成可能。

* 作成後、フォームURLをLIFFに貼付→「共有」ボタンで任意グループへ転送。

* 部員は共有メッセージ内リンクから回答ページを開き、結果は自動集計される。

---

## **4.5　外部申請シナリオ（自動返信付）**

![][image3]  
`sequenceDiagram`  
    `participant 外部者 as 外部申請者`  
    `participant GForm as Googleフォーム`  
    `participant GSheet as 回答シート`  
    `participant GAS as Apps Script`  
    `participant LINE as Messaging API`

    `外部者->>GForm: 申請フォーム送信`  
    `GForm->>GSheet: 回答保存`  
    `GForm->>GAS: onFormSubmitトリガー発火`  
    `GAS->>LINE: replyMessage()で返信要求`  
    `LINE->>外部者: 自動返信「申請ありがとうございました」`

**特徴：**

* 自動返信はGAS＋Messaging APIの1対1通信のみ。

* 月間無料枠（200〜500通）内で運用。

* 配信上限到達時はGAS側で送信停止。

---

## **4.6　運用整理・役割分担**

| 区分 | 担当者 | 主な作業 | 備考 |
| ----- | ----- | ----- | ----- |
| LINE OA設定 | 幹部 | リッチメニュー・自動応答設定 | 無料枠利用 |
| LIFF管理 | 幹部（技術担当） | GitHub Pages／JSON更新 | HTML/JS編集のみ |
| Google管理 | 幹部 | Form・Sheet・Drive権限管理 | 学内アカウント依存 |
| 自動返信監視 | 幹部 | GASログ・送信数確認 | 月次確認 |
| 一般利用 | 部員・外部者 | 出欠／投票／資料参照 | スマホ操作中心 |

---

## **4.7　本章まとめ**

本章では、少林寺拳法部LINE OAの主要機能（出欠・投票・資料・外部申請）を  
 **LIFF＋Google連携によるサーバーレス構成**として整理した。

この方式により、

* 管理者はLIFF内でコンテンツ作成・共有を完結でき、

* 一般利用者はLINE上から直接フォーム記入・資料閲覧が可能となり、

* システム全体を**無料枠で安定運用**できる。

# **第5章　技術設計・環境構築方針（Technical Design & Deployment Policy）**

## **5.1　設計全体方針**

本システムは、**サーバーレス・無料枠内運用**を前提とし、  
 LINE Developers／Googleサービス／GitHub Pages の3プラットフォームを組み合わせて構築する。

構成の基本思想は以下の通りである：

* **シンプル構成**：全てのデータ処理をGoogleサービス上で完結。

* **フロントエンド中心**：LIFFアプリは静的ホスティングのみで提供。

* **安全運用**：トークンやフォーム権限は学内管理下に保持し、個人情報はOA上に保存しない。

* **引継ぎ容易性**：学生幹部の代替わり時にも短時間で再設定可能な構成とする。

---

## **5.2　全体構成図**

![][image4]  
`graph TD`  
    `subgraph LINE Developers`  
        `L1[LINE Official Account]`  
        `L2[LIFF App]`  
        `L3[Messaging API]`  
    `end`

    `subgraph Google Workspace`  
        `G1[Google Form]`  
        `G2[Google Sheet]`  
        `G3[Google Apps Script]`  
        `G4[Google Drive / YouTube]`  
    `end`

    `subgraph Hosting`  
        `H1[GitHub Pages]`  
    `end`

    `L1 -->|起点: リッチメニュー| L2`  
    `L2 -->|リンク生成・共有| L1`  
    `L2 -->|フォーム遷移| G1`  
    `G1 -->|回答保存| G2`  
    `G1 -->|トリガー発火| G3`  
    `G3 -->|replyMessage| L3`  
    `L3 -->|自動返信| L1`  
    `L2 -->|データ読み込み| H1`  
    `L2 -->|資料リンク参照| G4`

---

## **5.3　LINE Developers設定方針**

| 項目 | 内容 | 備考 |
| ----- | ----- | ----- |
| **チャネル種別** | Messaging API | 無料枠で運用（200〜500通/月） |
| **LIFFアプリ** | Webアプリ（フロントのみ） | Endpoint：GitHub Pages のURL |
| **認証設定** | login／getProfile のみ使用 | メッセージ送信権限不要 |
| **リッチメニュー** | 各機能ページへのURI設定 | 出欠／投票／資料／申請／連絡先 |
| **自動応答設定** | 固定リンク返却用キーワード応答 | 「出欠」「投票」など |

**管理手順要約：**

1. LINE DevelopersコンソールでMessaging APIチャネルを作成。

2. LIFFアプリを登録し、`liffId`を取得。

3. GitHub Pages上の`index.html`をEndpoint URLとして設定。

4. OA管理画面からリッチメニューにURI（LIFFパス）を割り当て。

---

## **5.4　Googleサービス構成**

| サービス | 役割 | 主な連携 | 備考 |
| ----- | ----- | ----- | ----- |
| Google Form | 入力UI | LIFF／シェアリンク | 投票・外部申請 |
| Google Sheet | 集計・結果確認 | Form／GAS | 自動集計＋参照用 |
| Google Apps Script | 自動処理 | Formトリガー→Messaging API | 返信制御・送信上限管理 |
| Google Drive／YouTube | 資料保管・公開 | LIFF参照 | カテゴリ別リンク表示 |

**権限管理指針：**

* 各Form／Sheetは「sophia.ac.jpドメイン限定」または「リンクを知っている全員」公開設定を選択。

* GASはフォームと同一ドメインアカウントで実行。

---

## **5.5　静的ホスティング環境**

| 項目 | 内容 | 備考 |
| ----- | ----- | ----- |
| 使用サービス | GitHub Pages（またはNetlify） | 無料枠 |
| 公開内容 | HTML／JS／JSON（LIFFフロント） | API通信なし |
| 更新方法 | ファイル置換→自動デプロイ | 管理者が直接操作可能 |
| 構成例 | `/index.html`, `/config.json`, `/assets/*` | 簡易構成推奨 |

---

## **5.6　セキュリティ・運用管理方針**

| 項目 | 方針 | 補足 |
| ----- | ----- | ----- |
| トークン管理 | Messaging APIトークンはGASプロジェクト内で安全保管 | 外部共有禁止 |
| 個人情報 | OA／LIFF上には保持しない | Google側に限定 |
| 権限引継ぎ | Google共有権限を次期幹部へ委譲 | 交代時チェックリスト運用 |
| メッセージ送信上限 | GASで80％制限ロジックを実装 | 無料枠超過防止 |
| エラー監視 | GASログ・LINE送信結果を月次確認 | Slack通知も検討可 |

---

## **5.7　運用・引継ぎチェックリスト（例）**

| タスク | 頻度 | 担当 | 内容 |
| ----- | ----- | ----- | ----- |
| LINE OAリッチメニュー更新 | 学期ごと | 幹部 | リンク・画像の更新 |
| Google Formメンテナンス | 必要時 | 幹部 | 不要フォーム削除 |
| GASトークン確認 | 月1回 | 技術担当 | 有効期限／送信数 |
| Drive資料整理 | 学期末 | 広報担当 | 古い資料整理 |
| GitHub Pages更新 | 随時 | 技術担当 | config.json変更反映 |

---

## **5.8　AI協働開発・保守方針**

本プロジェクトでは、AIツール（ChatGPT等）を活用し、  
 次のような支援を受けながら継続的に改良を行う。

* LIFF画面テンプレート・GASスクリプトの自動生成支援

* 新機能（例：定期配信・統計グラフ）の試作コード生成

* バグ発生時のコードレビュー補助

* ドキュメント・マニュアル自動整形

* 翻訳・多言語対応（日本語／英語）サポート

AIを活用することで、部員の技術知識に依存しない**長期運用性と学習継承性**を確保する。

---

## **5.9　本章まとめ**

本章では、上智大学少林寺拳法部LINE OAの技術基盤と環境構築方針を整理した。  
 システム全体はLINE／Google／GitHubの無料枠で構成され、  
 **低コスト・高可搬性・安全運用**を実現する。

# **第6章　運用・保守ガイドライン（Operation & Maintenance Guidelines）**

## **6.1　運用方針**

本システムの運用目的は、  
 \*\*「部員・管理者・外部者が安定して利用できるLINE窓口を維持すること」\*\*である。  
 開発完了後は、最小限の管理作業で継続的に運用できる体制を整える。

運用設計の基本方針：

* **定常運用重視**：新機能追加よりも安定性を優先。

* **手動運用中心**：自動配信やBot依存を避け、人的操作で制御可能にする。

* **情報一元化**：全ての資料リンク・設定情報をGoogle DriveまたはGitHub上で管理。

* **交代容易性**：毎年度の幹部交代に対応できるドキュメント整備を行う。

---

## **6.2　運用体制と役割分担**

| 役割 | 主担当 | 主な業務 | 備考 |
| ----- | ----- | ----- | ----- |
| 技術担当 | 幹部1名（情報系等） | LIFF／GAS／GitHub管理 | 簡易修正・更新 |
| 広報担当 | 幹部1名 | SNS連携・新歓配信 | Instagram運用含む |
| 総務担当 | 幹部1名 | 出欠表・フォーム運用 | シート整理・リンク確認 |
| 顧問／OB | 任意 | 設定引継ぎ監督 | アカウント保守支援 |
| 一般部員 | 全員 | 出欠／投票回答 | 利用者として操作のみ |

---

## **6.3　日常運用項目（定常タスク）**

| 項目 | 頻度 | 内容 | 担当 |
| ----- | ----- | ----- | ----- |
| 出欠表リンク確認 | 月初 | スプレッドシートのURL更新確認 | 総務担当 |
| 投票・日程作成 | 必要時 | Googleフォーム新規作成・共有 | 技術／総務 |
| 資料リスト更新 | 学期ごと | JSONリストまたはDriveフォルダ更新 | 広報担当 |
| 外部申請確認 | 随時 | 申請フォーム回答・返信履歴確認 | 技術担当 |
| OAメニュー画像更新 | 年1回 | デザイン更新・メニュー再登録 | 広報担当 |

---

## **6.4　エラー・トラブル対応**

| 事象 | 原因 | 対応方針 |
| ----- | ----- | ----- |
| フォーム送信後に返信が来ない | Messaging API上限超過 | GASログを確認し、翌月まで停止 |
| Drive資料が閲覧できない | 権限設定変更・URL切れ | 管理者がリンクを再発行 |
| LIFF画面が開かない | GitHub Pagesデプロイ失敗 | index.htmlを再アップロード |
| 自動応答が動作しない | OA設定の削除／更新漏れ | OA管理画面で再登録 |
| 管理者交代時の設定消失 | トークン・権限未共有 | 第6.5節手順に従い再設定 |

---

## **6.5　管理者交代・引継ぎ手順**

幹部交代時には以下の手順に従い、技術資産を安全に引継ぐ。

1. **LINE OA管理権限移譲**

   * OA管理画面の「メンバー管理」で次期幹部を管理者として追加。

   * Messaging API・LIFF設定権限も同時に移譲。

2. **Googleアカウント共有設定**

   * Form／Sheet／GAS／Driveのオーナー権限を次期幹部へ付与。

   * 不要な旧幹部のアクセス権は削除。

3. **GitHub Pages権限移譲**

   * リポジトリ管理者を追加。

   * `config.json`や`index.html`の更新手順を伝達。

4. **運用ドキュメント引継ぎ**

   * 本設計書および操作マニュアルを共有。

   * 年度単位で更新履歴を残す。

---

## **6.6　メッセージ送信制限・監視**

* **無料枠上限**：地域により200〜500通／月。

* **GAS側カウンタ**：送信件数を変数で保持し、上限80%到達時に自動停止。

* **確認方法**：

  1. OA管理画面「分析」→「メッセージ配信数」で月次状況確認。

  2. GASログを確認し、過剰送信がないか点検。

* **リスク対応**：上限到達時は手動返信または翌月再開。

---

## **6.7　バックアップ・データ管理方針**

| データ種別 | 保存場所 | 更新頻度 | 備考 |
| ----- | ----- | ----- | ----- |
| Google Form | Googleドライブ | 随時 | 自動保存 |
| Google Sheet | Googleドライブ | 自動 | 回答ログ併用 |
| GASスクリプト | Google Apps Script管理画面 | 更新時 | プロジェクトバックアップ推奨 |
| LIFF設定ファイル | GitHub Pages | 変更時 | `config.json`履歴管理 |
| 設計書／マニュアル | Google Drive (共有フォルダ) | 学期末 | PDF化して保管 |

---

## **6.8　改善・拡張の方向性**

将来の拡張・改善を以下の方向で検討できる：

| 分類 | 例 | 補足 |
| ----- | ----- | ----- |
| 自動化 | GAS＋定期配信・集計自動通知 | 無料枠超過に注意 |
| データ可視化 | Google Data Studio／Looker Studio連携 | 出欠率・参加傾向分析 |
| 外部連携 | Instagram API連携、活動告知自動投稿 | SNS広報拡張 |
| 学内認証 | Sophiaメールアドレス認証 | セキュリティ強化 |
| AI支援 | ChatGPTを活用した資料整理・返信文面生成 | 運用負担軽減 |

---

## **6.9　本章まとめ**

本章では、上智大学少林寺拳法部LINE OAの  
 **運用体制・管理手順・引継ぎフロー・改善方針**を定義した。

本システムは、Google・LINE・GitHubの無料枠サービスを活用することで、  
 低コストかつ継続的に運用可能である。

今後は、運用の安定化を最優先に、必要に応じてAI支援や自動化機能を追加し、  
 \*\*「人に依存しない運営体制」\*\*の確立を目指す。

# **第7章　まとめ・今後の展望（Conclusion and Future Prospects）**

## **7.1　本プロジェクトの成果**

本プロジェクトでは、上智大学少林寺拳法部の部内・外部向け連絡を一元化するため、  
 **LINE公式アカウント（OA）を中心としたサーバーレス運用基盤**を設計した。

これにより、以下の成果を得た。

1. **低コスト・高効率な情報連携体制の確立**  
    　– LINE OA・LIFF・Googleサービスのみで完結し、サーバー・課金不要の構成を実現。

2. **管理者・部員双方の利便性向上**  
    　– 管理者はLIFF上で投票・資料共有・外部申請を簡易操作で管理。  
    　– 部員や外部者はLINE上で全ての情報へアクセス可能。

3. **将来にわたる継続性の確保**  
    　– 技術ドキュメントと引継ぎ手順を整備し、幹部交代時にも短時間で再設定可能。

---

## **7.2　本設計の意義**

* **学内団体向けの持続可能なIT設計モデル**  
   　大学クラブや学生団体でも、無料枠サービスを組み合わせることで、  
   　小規模ながら堅牢なデジタル運営が可能であることを実証した。

* **サーバーレス＋ノーコード開発の実践例**  
   　プログラミング経験を持たない部員でも、  
   　Googleフォーム・スプレッドシート・LIFF設定を通じて機能更新が可能となった。

* **AI・自動化との親和性**  
   　構成要素がすべて外部APIで完結しており、AIツールによる保守支援・自動生成との親和性が高い。

---

## **7.3　今後の展開方針**

今後は、以下の3方向を中心に発展を検討する。

| 分野 | 方向性 | 概要 |
| ----- | ----- | ----- |
| **運用高度化** | 定期配信・通知機能の追加 | GAS＋Messaging APIによる自動リマインダー機能を段階的導入 |
| **データ活用** | 出欠・投票履歴の分析 | Google Sheets集計をLooker Studio等で可視化 |
| **AI連携** | AIによるメッセージ生成・問い合わせ対応 | ChatGPT等と連携し、問い合わせ返信の自動化を検証 |

また、必要に応じて次のような機能強化を想定する：

* 部員認証（Sophiaメール連携）による限定アクセス

* イベント専用LIFFモジュール（新歓・大会申込等）

* SNS統合ダッシュボード（Instagram／YouTube／LINEの投稿管理）

---

## **7.4　持続的運営への提言**

今後の長期的な運営においては、以下の点を重視する。

1. **人ではなく仕組みに依存する運営**  
    　– 定義書・マニュアル・GitHub構成を常に最新化し、属人化を防ぐ。

2. **AI支援の積極的活用**  
    　– コード修正・文面作成・FAQ対応など、AIツールを活用して運用負担を軽減。

3. **セキュリティと透明性の両立**  
    　– 外部サービスの権限設定・トークン管理を明文化し、情報漏えいを防止。

---

## **7.5　本書のまとめ**

本設計書は、上智大学少林寺拳法部のLINE OA構築において、  
 **要件定義 → 機能設計 → 処理設計 → 技術構築 → 運用設計**  
 という一連の工程を体系的に整理したものである。

本プロジェクトを通じて、

* 学生団体でも実現可能な「無料・安全・簡易な情報基盤」

* 管理者が自走可能な「ノーコード運用環境」

* AI協働を前提とした「持続的なデジタル運営モデル」

を確立したことは大きな成果である。

今後は、運用を通じて得られた知見をもとに、  
 他団体・学内組織への展開や、より高度なAI活用事例の共有を目指す。

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAloAAAD8CAIAAAAg451nAABDkElEQVR4Xu2di3cUx5no92/ZPbPb5y4xe43JPYuZay0oa+uQSEf3Wlo2xglRNkC8JoRYysOKryPuxoF7/OBgxeKahETesIa1jW0eciwkm7k4KLFN8AMLIyR7ZIQeiBF6S6NX3a+7elo91Y+p6uoSM9Pf73xH9FRXf1Nd1TU/Vc+g+QuCIAiCIJHnL9gCBEEQBIkeqEMEQRAEQR0iCIIgCOoQQRAEQQjqEEEQBEEI6hBBEARBCOoQQRAEQQjqEEEQBEGIjw57x6duTs+ypR5ATajPlnojlJwEqs8WeQOZ1SUngvVFe1Ko8QGSC9UPMEz89YXOlAgmJ+qHSai+UGXR5Ep7Mq8aQxT3ZF41RqgnAyQXqh+gZ/jrq2uMuw7Ti4uQgv8phSoTwfqijaH14Se7wwOlyUXrCzWGCNanlfOkMaLDKlRZNHmwYRKtz5Z6kFeNIYL1hSoTwfp5Nax51Rgi2JNKkxPB+qI9KVSZiNR31yGCIAiCRArUIYIgCIKgDhEEQRAEdYggCIIgBHWIIAiCIAR1iCAIgiAEdYggCIIgBHWIIAiCIAR1iCAIgiAEdYggCIIgBHWIIAiCIAR1iCAIgiDER4cDUzMLS0tsaUgoTU6M/GxReChNDt2iLj8kH1SWnCgeVsisLjlRP6zqel7pNUNwWL1R3TN4zbiirvGeOuwdnxqdnWNLQ0JpcmLkZ4vCQ2ly6BZ1+ZUmJ4qHFTKrS05wWL3BYfVCdc+oa7zS5KRge8ZFhwOTM73GN2LQYHe7wV+TSQ4P2RoOhL7+w55c6BC21I0AyYW+1cWenKdnSNDGh548wDUTeFh5Gh84udAhioY1f66ZAMPKXzNvXwp4ej5A8vwZ1gCN56+5ksPKk5yINN5Fh+mFRapfWKpzGp7/+xiZ5PCQreFGL/f3N46l9V82e43fTWCb3e0G/9dmBkhOjMazRR5AWugWmp+zZ4QaHyA5Z+MDXDNEZFhpz+TVNcPZMyTQsPInDzasnD0TYFj5e4YmL9BhtZJD4zmTE5FhDXDN8A+r/ZrhbDx/z6zAK7xoz/And9EhhT4fW5ph/saSTHzx+fRI35yzPKyA/M5CoWBP2AbnZREMeiWxpSEhk3xqceHz2Sn/OJ9KfTQ+5iwPJSCzuuQQfxxJseccHrTnl0a+UBFjg59dv9blLA8rIDk8hbPcGexpczAqcrO0Nw0XoVicT006C8MKSP7R+KyzPHDYX91lZmtOmOTX5+H1eDjEeO/WtcuTA87yUAIyQ35nuU/MLi3Yzt4TTx26sjhOBn+SHn5ibubiYnHHyK/n4Uwnz3J1YnFzx6W3IRpvfHZ6bLCI4/XRATjNtZ8k2POXZulK6/yB+MJ/blv69PfFHQv//nU406X+S2wXSPOXH49AHB+de22smOPnQ9Nwmms7b7Hnr4yyz3728PWDZyYuvjX5YRHHb0fa4Ezfnepizz8bMR2CIcZPLSxOkihE+oslOF+2C6IHSGJ0cS4iASf7RH+OOSOKbojudjKTikIsXXwRzpftAjm++fk4SOLmEolIwMmyXaCGp4dfBUmMLk5GJOBkl3w/7yqgw4URXYdObRRxwDp4bGzMvweLm6Opvksz405tFGucm7gJRpycnGQ7QgJdDw5tFHHA+YbbgaCH7vklpzaKNWCZeCY1ubCg/NYU6OHDmc+c2ijWgPM9mfrj/Pw82xEZBHQ489Fi1HR469j86OgoGJHti8jwk77LTmcUd+ir4dHRRb5PAPKwcOzbTmcUccwfvBc6cGJigu2IoERqaUhjf/8E9KHqX8QjtTSE2Hpt//6h13xmN+rQL6gOgenpabY7okFkdRji70DR1CHg82u4EJHVYYgXoSuR1aFXx6IO/cLSYbg3fwoI1KE8kdXh7CzXp9tzgjpUBOqQAXXoF6hD1KE8qENJUIeKQB0yoA79AnWIOpQHdSgJ6lARqEMG1KFfoA5Rh/KgDiVBHSoCdciAOvQL1CHqUB7UoSSoQ0WgDhlQh36BOkQdyoM6lAR1qAjUIQPq0C9Qh6hDeVCHkqAOFYE6ZPDUofOLSFCHFGfP+KO6vhCiyX90rdMpjOIOTh3y9yTqUJLI6nD4lsI/XgoXMOqQwV2Hrl9AFUSHly5Y2+df7WD3+kTPpa5hR+GKh1OHQl9aRsTrO7vdH6H6tLJQY773+cdOYaxMdN5iSwJHz+Cgs9AreHQo1JMro8OLr592Ft6WENIhzwUcTR1e6hv45Pog5zVG+HrSglZGHTK465C4/fIbQIeaVrc+VjOUTE2//fR3XuhfvfOMvj1J4Kf20Kmh5MQjsbhebbduyrP0qNMNWixuxSO7K577wMzWdaBmvVGz9J5q6ynON1TDQyPqF9saM9vVDx9J2XZVv5QklVr8xADbQv9w6pC49Yw/qusLIZpcaHW4oeQB28M/bSip0mPn6/CwpqSqrm3EKP9iQ81L5i4jbId0a2sep9u71pQNnX9piJZfPbyrTd8ob+q2P51XHGt6/bXTb1mxr2YjFN793d87a7oGjw6JSE+q1mHiB8vzRftBa9NX9T+Rqm08QPdCia1ya2Xjh84M4YaQDnnIocPUpbtW6ed+x5d3sLs4QovVOAv1ONe4tX5vrS3uq9rL1hGMnVq8y1HoGvm3OhzZcu990MllW55x7Modu2JxZ6EVkPbcTbYwV1weYktyR3AdOhHWYap/dJJMdyVhW7uzAX52XdC3aVAFgg7BVdqqMvhp6pDG6YbnLkGGrucuLD+jFjMtqBkSXY5LzTQbRGX2ruyaE1qsIuvAXOGqw0gh9N6hpl/07iXlxou1sd2tlR8ebXvc6bYazfayHvvW8i5BHfYNDvbYoiYW77k16azmFZw65Ee1DiHgddb6SXV4JGnuKr3nfnts+22n8/BwY4V1CJPa3O5udu7NGZ46dIQWK3Mr3OIs9AotxivsfHvv8G4wlj6JJltq4y2OvTnDX4cQO0q2OQt947KjJHfcVh2CjcoOwULQHg8bfnrz1YRW1fjm+RS7OgSx2ZaGVjxyWs/2zd+kzLQBdUga7oxnSTdXoA5D1GHf8Vpj20OHc927zOWjHlXNttubbY8L6ZAJLWZfgOaOQtQheaP+5EBq7U/PEqrD5O+sXc7ZxB4bdqywDr/WlDS359N0435jsajFzcXcusyvWcxDKkJLh8k/H6Llp0bZp9Bj8oy2/QxbCM9uHJ6cYctdY7mpuSLPdHhZiz1Gt4duXaPLskwfbqTl+6o26g+1cvrQfr2N2nTYefxHtPDinJHt3We0VV/Peq7Lh44Z3s0Vl2GdOmQk4Y/brMOhvnTlQ3sf/ZEZWqxhNJlRWmZ1aPWaXVSrY/ETl5nnSloVNF8dUu9aNe0Puw7UULNyBuowRB3Czw17Oy0damsqrJulnaef0DTbjdbzT9qTDB2vfeaqkSRLh+fsU46Gqy9dC32i4HS4/8cN9ctxgK4OD3eae3dm7W1YW8Q6NKLrd7vub07Bxqm6+M8+0ksePUd3JV+cJDfbGmh92HvKqG/pUDN9mdZidfaENJ4qj+uHZx6+cjqhx1F4TauGjbP9euFOxwUJYWteV4ex0f9ec+1Z09xekbc6zMQf2qiKrh7S7Th4VNt8VH/Y9tiGvR9CfXMFefVQ+fMw+5Z1qMXuMzdKrJuuI1ua9Tp6zMETuQjViswhepNGp6/VlOv3b3um7Q3zi9usQ4hHDiZgLZiJS1Y5FZhReFRfKb6auNBDFj9oXn3PrtGx5Q/dgMAyFky+OZY51leH9l1MTdShKOHq8Fdb4r+6Pue+OsxEH5iy8oi9pMpKYhxy7LsV9nWkf9ztaFLOKDgdkpnW0m8YtvvG/U2d5s3Sytg36d712TdLtSLWoXGzFDz3VLf+8P2mmp1tsJGk2oOg5eti8bvi1Zpm3mK169CU3OkO5im2r4s/9WlWCcTzWyt2tk18LbPozBk/K1mu+eL2HEflrQ5bauPPXNU9l9n19sVF3YLlTcbdy6uHtNq3Rw2ZbSgp1zKrQJsOq1473WrEe8yz9F04VNX0IVPoHQX33qERa9cvf56ldO1G6rY3D8BvVfFNX2806iQtmWWiw1pQPlxRZi0KHTdLO8wDuXXYcGf8fNYT5QjUYTAdWqpjdAi/CcIq0EeHLT9/QIs/kVV4+bC2zfwUTPmzH9ytxX96lsuFQ9f/BM/eJv7x1ELUYe0bxsYb9VSHrXsarI/SFL0ONS2zmPvUeO+wreGu3QnY2LnOXM997VnDl58208UZXGFZh2feEbzLEttM1tLtjlj80XMT9pKbhlOf/0SvxqXDyYmuoZQWq6itb9hQUqYZCx3qZq/IMx3qeqMbr33f0OHi5Wcu6w8vNm3Vy+fe1tbovmypLd9xYsSon7WaBB32ZOcZndar0Ri6/h7M67trLMXyxGVdw4Jx+3X4zDu29w6P1FO3jab0n11v0iWjuTq0rR07rAXlr3cuf8TG+iAMvZ702N1xdre1lK5ZzKFD/Yq0780ZqENRHdIwVJe5mQnyW9bhXFtDhXmzdPkGiHH49Ahs1534gs2pVSxvr3qgb459UteAVHeVZ2uVOwpRh6vXGrZbu8FaHVpReWe89DsH9e3RTuiWrXuOOQ4POVZYhx+d0H+31mNVNS357e4t+pk2d9GHv9hcoe9dY64CH11nXnjrfqyvAl+pr9Go0ub7afl920+Zya+dgYf9jmfMhC65DTw6/OTU86cT7w/pt3Ct8P9YTb7pcPTme7Rz7ir/N1pSFacPzXue7x59DB5u2GbcMrXf6lylf0YGVn6wrQvs1nurjfKqvX+gNaEDq74vJEIafyhIHYYaE/b/YiEapffschb6B+pQSIfFEQWow/yKFdahUDxVHn9l3tx2/aRonkTe6VAo2paXhjVZb/jd5igyHa50oA5Rh/KgDiUJUYewBLyvpHqDEWdTjr15E4WtQ1jzZf5X8Z4TmY/J5EGgDqUCdYg6lAd1KEmYOiyQKHQd5megDqUCdYg6lAd1KAnqUBGoQwbUoV+gDlGH8qAOJUEdKgJ1yIA69AvUIepQHtShJKhDRaAOGTx12Ds+NZaes5egDin8fzY+ANDn6vIHSI46lAd16ANck8zrjJNo6vDajeFPrg+yfRES9KUAdcjgosOFpaXRWb2zBqdmYMMqRx2Op+dpz8BP2F7uMl/4DQRpoc9pfhgFdrcbN6dnIdhSN6DBAZLfxi94ul3Bo0PoGf5hRR26Ql9n4JqkrzM+12QEdbjv2ljXwCDo0L9n7AR4KUAdMrjosH9S7ykrrHLUob1bOF8Nhb7v0J4cRoHd7QZ/S4IlRx26QruRc1hRh64wrzM+12QEddiQHKHfd+jfM3YCvBSgDhlcdEjpNZYR9hLUIYXzmrPgfNGk0NUnWxoSAZILfd9hcQSPDonIsKIOfYBrknmdcRJBHe7vn/hiSOHNUvpSgDpk8NMhvncYig6FCPD2Hj8BkuN7h/KgDn3A9w5dA987VBHBdehkcWopajoceizt1GGkeP3W4LmJm05nFGucGB0MXYfzB5T/1ey8Cjhffh3yADp8b2bB6Yxijd+MpP84Nh3uRegK6PDc1CdObRRrwPm2j1706VgBHQKgw5Hmeac2ijJmLuir4YjrEND14NBGsQac7C/7u30mTABAD4vv/tapjaKMxbf+T+g6rL8+FakFIpws7cAQL0JX/n3krUgtEPWT9e1YMR0Sw4gQ4ycWijtu7JnTT/PPpg6npsTuMRYTX+36I0hiR/LDXwxcLeLY038FTrPq6rv+EyYASze6wBDzjfHFxNPFHfppHojPjvTTPpyby3EXlJ91n46CJB4bmH58sJij6rNxOM1q/fexkC9CL77b1wSSePbmyaZUSxHHowMvwGl2T17371hhHQJwlZvDtVL89V/9PVu0gnj1XXRYWlpiO0Ux9/+Pb+/YVseWriDpdJrtBTmmp/XbXytJkc2alb8I7y39p7raBrZ0BQnx9wkfZmZm2CdWzIMP/CtbtLJ4ze4gOgTgWmefQSW3cWLDmc7P8/4XwyJmYWGB7RqV3F4dhv5STmGfRjG3d9Ys8f1vOSEmJvS/1bJi3F4dwu9P7PkrY3Jykn16ldxeHfrc6guoQ2B2dnZipfjrv1rHFq0IUX7L0AkYETqE7SM1VP3Pf/nu9h+ypStCWO94uQK/ibPPp4zbNWt8Xm7kgd9NV+wivPcrm39Y97/Z0hVhkfu/8YTFSs7ub2zZyRatCHBl+ndscB2uJFoszhYhRc0//9N3v/fwT9lSRAScNZJsum/LT+v3saWINN/+1g/YovwAdYjkI6hDeXDWSII6VATqUAqc2FEDdSgPzhpJUIeKQB1KgRM7aqAO5cFZIwnqUBGoQylwYkcN1KE8OGskQR0qAnUoBU7sqIE6lAdnjSSoQ0UUng57x6c4vz2LCH79GxFMToyJLVRfqDH83xNGEUpOBOuL9qRQ4wMkF6ovOqw+9Z06FDpT4pvcFaEzFe0Z0fpClb2Se+lQaU96NcYLpY0hcj2ZU4cr2ZicCPVkgORC9f17xqlD//oM4TbGDupQ7DIigsmJYH3RnhRqfIDkQvVFh9WnPuqQLfLGKznqkMj1JOrQQrS+f88Ung7zCq+JjRQAU8nuhewS5qEbTh3mC1P9+s9Z9z/ypDNwqVtgqioEZ40kOXWIBMOpwzwBdYgoZLano7XljFba0NqS6J5KrY7F18Z3tF5MmbtbGmpbsupbrJgOrx3aUd86wZbqdK3dc4EtI2R/aRx+z9ypeV+Q7Q1NPWRbPH7kCrtnhcFZIwnqUBGoQylwYhcu+zv1n1pJIyFJdl97Q207WwY0bYpbOpz9uLnyYObAnuOlJdX2kL8w9qyJD7NlSUhrRemmhuU9Cxe0B48T44K0AuTHlFixfODt4LY3oNBBHSoCdSgFTuwCpal82Q2VBzssjZm7jYWUEzjKvjo8+VD8pPvtxy7DsibWmwOVsRr4Oc71ZgHRypvZIoPK/R1Hnjw0bCQ5snsLTaZpcfB37Tr9atSMZ7HQYvXDN1LDN2Ch2VG6r4t0PF3f7n1DdUXAWSMJ6lARqEMpcGIXNFpdh/GvvsjrPliTyJTDtqsOjzyYpUOy0KFtP5NVwyBRV0aXnpTWloQex/ZqsWrYuDhgljsXbXYFmhlmL5X+mDZSJ1FXcc0QYGksvn5z47JYe5pBh+Mj+s1V+iwQdA/VoRbTl5LapuZtPndTVwqcNZKgDhWBOpQCJ3aB0nlsb339Xq10F/x8ubOL8OkQyqkOOzJvv2mxLVk1gLEOTctan+ksTGhaRSX/1fLx8uJyj7Hm07lxaT34e2FiNaxomVSGDimO1aEhQuPn2liZvkC83eCskQR1qAjUoRQ4sQuXTmN1WKrtIn1Hia8OtViFuTV1xtDhD7XSQ7SgUiuzqlFcLwlN063JOsybPWusmunhzuMdto+80sbU+ukwTm/8GovKlPmeorHuPFylH3UtYZ3o7cG1ixB+UIeKQB1KgRO7UFnQ/1sCvVlK7x/adUjIBIwsLBzXr4nDqm65mJC/+5u49qVKe4nJ2CU4ZN9Jx6dyCEm8PwEJh2+kSrmulq79LyQ6rmQ+42pgv8wqtfimBxugbZtLqpdvrnqsDjseL6Pvbs4mz2ixjeNw+L4Le0p4mqEQnDWSoA4VgTqUAid24TJ+w1QOfctttqfD8UlOFwL/RwvQocj/0BXkRsfLmXcr6+vNlSsw/k5G8X3mPdLZngsdSfwoTWGDOlQE6lAKnNhRI7AOEQucNZKgDhWBOpQCJ3bUQB3Kg7NGEtShIlCHUuDEjhqoQ3lw1kiCOlRE4emwd3xqLD3HloaEaHLRiS30B15FUZocukVdfqXJifiw+uDUIWQOK7krSntGac97JRedNV6EOKxO8mRYoa/+2PFnpjCnDlX3DGfjA6A0OcnVM5I6VNd4Px2Oznqej5P04iJb5I1octGJraizKKLJhXoGukU0Pz8Bkgs1XnRYfZI7dQiZw0ruitKeEe35UJKLzhovQhxWJ3kyrJrx9xk2/kP1zPy8VcijQ3WN9xrWUAiQXKjx/j3j1KFQctHG8yd30WH/5Aw8mRXsbjf4azLJ4SFbwwGcDL1YMTAwMFYmiK8O7S9inC998DoGNTlfmkVfJInIi3CAxvPX5HmFZ3RIe4Yzf87kTviTu+iQ0uurdyecw0wRTU6vTn44Tz4YosmFekb0Fx8hAiQXarzosPokx9UhW+SNV3LRWeNFiMPqJE+G1S7C5OfXaKGPDimqe4az8QEIkFyo8f49U0irQ0qv781fSUSTi05soc4SRWlydbfFieLkRHxYfXDqME/eZAqG0p73Si46a7wIcVid5MmwQl+tXrXREiGFR4fqGu81rKGgNDnJ1TNOHQqhrvGeOswrwprYSKHg1CEiCs4aSXLqEAmGpA7VgTpE8hHUoTw4ayRBHSoCdSgFTuyogTqUB2eNJKhDRaAOpcCJHTVQh/LgrJEEdagI1KEUOLGjBupQHpw1kqAOFYE6lAIndtRAHcqDs0YS1KEiUIdS4MSOGqhDeXDWSII6VATqUAqc2FEDdSgPzhpJUIeKQB1KgRM7aqAO5cFZIwnqUBGoQylwYucPwyPml7wP39C/3d5Od8clpiQwqEN5cNZIgjpUBOpQilAmdn39IbYob6iMxWvb2cL99XvZIm6Gx0xpdTxRfXLELOzYV32kz6pChgfMOq4Mv7Bj65EUWwpjUd5sbsQasvdAyS6mJDCoQ3lCmTVRBnWoCNShFKFMbC1WwxZxUxuLd7NlwlQeTFrbTT36z2sv1w9bRQ4qec+6v7a+sbVDT574ccWe9iyHJeriicx298Ea+rwmCxNeHTve3rC+qqG+fi9E5Zr4SeMPBGqOv/qv2btlIelzLqKgDuXxGlyEE9ShIgpPh73jUzenZ9lSD6Cm0N9UFUpOjIktVN9szEIy86qtr2NAh4erNuoPNX0RA26ge2vfuKkn72kGB8BDXR4L/XTX5kOmwGw67KC7VlcdpY+brujPAqozkxuh7xi7RLd3nbpBbC6hq8CMlpLwdE3lejmV1qP/uNxgqsOOPVvoc21eZWZIjOk1YYOewnLPfNy47VX9BuaeeMX6debK0q7D95/91i8+8h6msTOWz7R1egPosJqnY+3yWB1WambzlnsgFz6XgVOHUNOrsis+yV0RuoBFL3jR+kKVvZJ7jYLSnvRqjBdKG0PkejKnDleyMTkR6skAyYXq+/eMU4f+9RnCbYwddx0KfQEVMZ6PvzIRrJ82vu9QqH6v8b1iYAL7Ysh6dSjNeplIabHH9OQ9zU1XzCLwE92walo6tJKvzexaX9dBNyw9UI3VavHhTOPpN4w4V4dgIHowPKMurZ5mreqodaZGnon1W4/Th5tfoMu+tBarI8bpgBftPVm7fF4psmBu2XX48vfj/3HL6xvXlleKqzMbNLm92cRDh02V8drdW6zGWB3og/815tShT2Un/smdWMPK7vCAJhetz5Z6EFZjvHQo1BgiWF+oMhGsv8LD6q/DFW5MToQaozQ5yVVf5vsOSa7kTvjru+sw3/Ca2LmZnah9sJqudaybpVRXO7X44Y7k8I2U+bLeY77KE8MrrS0JGlYJ1WHn/urKPQk4alOmSZZx99wb11aVrdXMhWOlI4ndK/vfT0GS2Yy0TB22N9jrQIb1D52qbTc/sbJ5n5mttUV3qLNPtjpKGCyFM+zbtNGSbhbZd1Ohwc6wLjNYqlo1eXToj1OHiCjOKwQRwl+HSGCcq8M8oZh1mDjZTzfo4YwOaeFsZ7NTh0ceZJ/O0iG80LcuZHnC0uHFJyr0XRn2rImfNO5qwm8/9B9rXUVsR5kPqQ5vHKfmptB2VmqZu6Pbz5g7ZvWEzj6ZTezV7n2aKVxmtsv50ZjZAf2O7smky2dqxt+Hntk4zpQuJDWtAv6dTZ7SVm2x7wEd0vca6duN9l0BQB3K47xCECFQh4pAHUoRbGJffEF/LxCi1fg4JaPD7iN1ugn6SH3JRv39PJsOjcr6gau/vIM+XH7vcOwClG/df6n70C6qN0tswy/soEdZrQUrwPbae+vow9Yndmnse4cmhyvNW5oXD+qtWl2ifwg281EaXb2gpdZ6883OTdtPEY8+mU2esTcgQ3rtqrgWN5thsqCfyObt7p+21Z+lPmPfDOOJRm2V2SEGE9ZtVYKrw/zDcRkgYqAOFYE6lKIgJrbtPmdH5nM3RUWi3VxtuzLcbpq189je1vau7J3CoA7lKYhZk8+gDhWBOpSiICZ2bVV1aYkRm0L773eRBXUoT0HMmnwGdagI1KEUOLGjBupQHpw1kqAOFYE6lAIndtRAHcqDs0YS1KEiUIdS4MSOGqhDeXDWSII6VATqUAqc2EUMDO7favd8/tkX9kLUoTw4ayRBHSoCdSgFTuwiRsv875QtX3/YKkQdyoOzRhLUoSJQh1JYr5gYRR9//+Wvjo9NoA7l0VCHcqAOFYE6lAIndhFjifCl/zxpFaIO5cFZIwnqUBGFp8OBqZmFpSW2NCREk4tObMjPFoWH0uTQLeryQ/JBZcmJ+LBSYHA3llQxhU4dQuYAyflR1+1Ecc97XTOis8aLYMPKST4Pa04dqu6Zlb9mwsK/ZyR1qK7xnjrsHZ8anZ1jS0NCNLnoxOb8++XBUJocukVdfqXJifiw+uDUIWQOK7krSntGac97JRedNV6EOKxO8nlYc+pQdc/INN4fpclJrp6R1KG6xrvocGByptf4Rgwa7G43+GsyyeEhW8NBWuQLnuzJhQ5hS90IkFzoW13syXl6hgRtfOjJA1wz/t/qwuhQtPH+yRnsyYUOUTSsYV0zXjrkP80Aw8pfM9hLAX9+e3KhQ3i+4ClA8rCG1Qv+lgRoPH9NnmGV+YKnnMmd8Cd30WF6YZHqF5bqPoa3w/99jExyeMjWcEPj/vrfsbT+y2av8bsJbLO73eD/2swAyYkxGGyRB5AWuoXm5+wZocYHSM7Z+ADXDDF6xqvxjA5pzwhdMz7JGQIMK3/PkEDDyp/cZ1i9dMh/zQQYVv6eocnzeVh9dGglh8ZzJiciwxrgmuEfVvs1w9l40WG1rhnXxjtXh0LDKtoz/MlddEihz8eWhoRocq+J7QXnyAVDaXJ6JbGlIaE0OREfVh/wZik/XslFZ40XIQ6rk3weVh8dUlT3jEzj/VGanOTqGacOhVDXeE8d9k1Mz/Gt6wMgmlx0YkN+tig8lCaHblGXX2lyIj6sPjh1CJnDSu6K0p5R2vNeyUVnjRchDquTfB7WnDpU3TMyjfdHaXKSq2ckdaiu8Z46zCvCmthIoeDUISIKzhpJcuoQCYakDtWBOkTyEdShPDhrJEEdKgJ1KAVO7KiBOpQHZ40kqENFoA6lwIkdNVCH8uCskQR1qAjUoRQ4saMG6lCeUGbNcPuh+vq9bOzv0Pd1Htp5Mk2rabEd9qOApiq2xE6CLfBEq2ykG6WxMrMkVmPt3bOGnmNKK2+2CsMCdagI1KEUoUxspIBAHcoTyqzpPrjsHgvqnvWxsm33xsGOLx+s2bx7rxbbCNvDVqWFpKa5HEvh1yG50ry+zrDvwHH40d1Yk1j+jH1Se+jM8I0UxMuNzXTD2icP6lARqEMpQpnYSAGBOpQnlFlDdThumAZi3PjfzKDDk9+rSIzBpq6fbdsPwc/Zk/X2A3VaGtbvuWAv0BxfYMLZyM5j+qq0NKbbF2J/u/68+0rjAloVB3WoCNShFJxzBikaUIfyhDJrqA4rzfuTHbXt+j/WncnZ5JnN+y/BxrZ4fPMTZ8xjMmyOxYdfcL1lmrT+Rsi1Q1kryPp1rCDr63fBk1ILWjqsrz/VtCne3dKAOixEUIdShDKxkQICdShPKLPGS4fXEs2Qv/5kR2lJNY197f1Q8vJA5siFC1qpvmrcY9zptDP7ap213bHHfEeQslNjdWg9KTHO6GSfbU+7rsP9tjc1X+607ZUGdagI1KEUjhmCFDmoQ3lCmTUZHZo3NpnVYdbna+r32o4j27R4t7HhbMZaW8nhSnavA0uHE01XyJGtFU2d5ud3qA4tH0NsO9JvHSYP6lARqEMpnDMKKW5Qh/KEMmt8Pkpj3yDZNeGpx60HxsPWEWNrQV9B2vZkqdGVTbBeXLdrvL3xmnWDdbbL3DB0aG9D5cGktS0P6lARhadDzi8isRCqL1SZiE9s0fxCiCZXXV8I0eRC9YUqE9/68jr0Se5KXtUXqkw86ovOGldAci2nz7a2JOyxrEOtzFqZrTf/zwP5QTzu/PqATZp+U1TTKqwSutxc/0TWZ20cJLsX9H9qy8to/UxU66VUh7Y2OHXo2jM+2Ovn1KFMch5E6wshmlyovn9lpw796zsRqs9f2V2HaZEvoCLG3y/nr0wE66dFvu+QZBrP3wWijRFKLlpfqDFEsD6tnCeN8b/GnDr0qezEP7mTYMMkWp8t9SCsxnjpUKgxRLC+UGUiWH+Fh9VfhyvcmJwINUZpcpKrvsz3HZJcyZ3w13fXITFScH5HFBH5NiyKUHJiTGyh+kKN4f+eMIpQciJYX7QnhRofILlQfdFh9anv1KHQmRLf5K4Inaloz4jWF6rsldxLh0p70qsxXihtDJHrSX8dkpVtTE6EejJAcqH6/j3jXB3612cItzF2PHWYV3hNbKRYceoQEQVnjSQ5dYgEw6nDPAF1iOQjqEN5cNbw05u0/wcOE9ShIlCHUuDEjhqoQ3lw1vDzN25/Hwd1qAjUoRTOKxUpblCH8sCs2fYvdRg8YfvMavxL/+Uf6GIRdagI1KEUqMOogTqUB2bNt77xfQyesFxIl4lXrvQQ1KEyUIdSoA6jBupQHpw1/Fg6pCKkoA4VgTqUAid21EAdyoOzhp87/nbDj3/4c6YQdagI1KEUOLGjBupQHpw1kqAOFYE6lAIndtRAHcqDs0YS1KEiUIdS4MSOGqhDeXDWSII6VATqUAqc2FEDdSgPzhpJUIeKKDwdDkzNLCwtsaUhIZpcdGJDfrYoPJQmh25Rlx+SDypLTsSH1QenDiFzWMldUdftRHHPe10zorPGixCH1Uk+D2tOHarumZW/ZsLCv2ckdaiu8Z467B2fGp2dY0tDQjS56MQW+gOvoihNDt2iLr/S5ER8WH1w6hAyh5XcFaU9o7TnvZKLzhovQhxWJ/k8rDl1qLpnZBrvj9LkJFfPSOpQXeNddAjupc8Hv5v4nJId/j8xziT3+Q3Cjsb9jRbj6XmaH37CNrvbDf6/BB8gORGZkJAWuoXm5+wZocYHSM7Z+ADXDPH9S/OMDmnPCF0zPskZAgwrf8+QQMPKn9xnWL10yH/NBBhW/p6hyfN5WH10aCWHxnMmJyLDGuCa4R9W+zXD2XjRYbWuGdfGO3UoNKyiPcOf3EWH6YVFdXOASQ4P2Rpu8OtwLK3/skk7C7bZ3W7wX0YBkpOgc4CzZ4QaHyA5Z+MDXDPE9zL10SFn432SMwQYVv6eIYGGlT+5z7DK6zDAsPL3DE2ez8Pqo0MrOTSeMzkRGdYA1wz/sNqvGc7Giw6rdc24Nl5Ghz4XvBf8yV10SKHPx5aGhGhyr4ntBefIBUNpcnolsaUhoTQ5ER9WH/BmKT9eyUVnjRchDquTfB5WHx1SVPeMTOP9UZqc5OoZpw6FUNd4Tx32TUzPcX9XsiiiyUUnNuRni8JDaXLoFnX5lSYn4sPqg1OHkDms5K4o7RmlPe+VXHTWeBHisDrJ52HNqUOPnknV1+91Bt1XmhmU2ZP1RwaWj9EZON55bLn+Tx79hb3x1oEipLTSQ/bHrS2JI0/urX1wixYrg+RN5Vk5uxtr4GeirqxzwV5Mmirj45nt7oM1Cfs+Dzx6xkRSh14XvDyeOswrwprYSKHg1CEiCs4aSXLq0IOkVtfBFNUaY1G7TvfK+lg1bJfu6yILF9butuQyoa1pSNQtDxk9hHSeAjVu27Rx824XuXrS3pAl463VTT16sWb74g54YrsOwXm02SC8bqvUeGgdQh/y6NAfSR2qA3WI5COoQ3lw1kgio0PGItRts/QNrAUy/s7T+96fsB9Tu0a3EejQcph9OaiBQWcnhm+kaFwbsx3pSnsD85DqsLSkGkLTyuBnoiWxORaH9aJuwZHEkStJ7XunIPnFJ7dcNJ5lPPN2m9mk/aYsUYe3GZzYUQN1KA/OGkkkdWiusQwzmUs9g3pY6u2/NNt5XNMquo23wC7uq6htv2StKeFYqzIx1m0Jm/+2rotfzNYhDPT6PReyitob7AtBiMzqsB48p2069PL3liWded6kVroLtLezsmyn4b/97SlbRh2Q6Po18bWGU5ldQqAOpcCJHTVQh/LgrJEkdB3Wlpdpa2oOf1vXCY3E/jrty3XWUbQQlEM3th3pJwv9mmZfJmaZMlPookPmYUaHerlW3kzvytJslQeTRqUkY1AIegrmqnQkTXB1mA/gxI4aqEN5cNZIIqNDpshaHYJO6NqLBpgpU8U8CtaCrY01pbGKTDl9hy9NnUSXdxDWXnfaG6w7q3q8XE91aD7pmhr4SQaObz2i59F/9h23TKyL0LibCrHvHf0oKkXaVNTh7QcndtRAHcqDs0YSRTq0f1CF0eHOePzIFXqzdEKLVdA37+wfeKHLu9x4rA4p8KTDN5KVmUXnvo/N8u72Q/Ut/ZWx+GzyzDbjnUKz3PiJOswXcGJHDdShPDhrJAmuw82NrS0Je2y26XB95k4pBKPDa8b/cLDeOwQ1EpsO9fprnqbbOWhvyGrAvh3mR2k27ap/8njHldSeeLwJkr/TWFpSNkzI7MeN2qrqzhG9TiVt6kK6tqqstkX/vM9hmiSh31NFHd5+cGJHDdShPDhrJAmqQyQHqEMpcGJHDdShPDhrJEEdKgJ1KAVO7KiBOpQHZ40kqENFoA6lwIkdNVCH8uCskQR1KM8rL59miwpRh2nvvzjnilB9ocpEfGKL5hdCNLnq+kKIJheqL1SZ+NaX16FPclfyqr5QZeJRX3TWeOGa3AfR+kKIJpepn1OHMsl5EK0vhGhyofpWZf2/bRjx4Yed1l6nDoWSE8H6/JXddQjH945P8f/VcKHKRLA+NAZ6U6g+VObvAtHGCCUXrS/UGCJYn1bOk8b4X2NOHfpUduKf3EmwYRKtz5Z6EFZjvHQo1BgiWF+oMhGsv8LDCjp84J//9e+//FWv+G9rN0E4y71CtLK6+kKVZepbOqRBO5bRoeiwClUmIvXddUiMFJzfEUVEvg2LIpScGBNbqL5QY/i/J4wilJwI1hftSaHGB0guVF90WH3qO3UodKbEN7krQmcq2jOi9YUqeyX30qHSnvRqjBdKG0PkepLq8KknD3rF4088+297f+ks9wqo7yz0CsgsWp+/MQGSC9W3esbuwv+6+iu0Y52rQ6FhFb3G+JN76jCv8JrYSLHi1CEiCs4aSXLeLEVyYljwH2dmsmzk1GGegDpE8hHUoTw4ayRBHcrz3C+tvzOwDOpQCpzYUQN1KA/OGklQh4pAHUqBEztqoA7lwVkjCepQEahDKXBiRw3UoTw4ayRBHSoCdSgFTuyogTqUB2eNJKhDRaAOpcCJHTVQh/LgrJEEdagI1KEUOLGjBupQHpw1kqAOFYE6lAIndtRAHcqDs0YS1KEiUIdS4MSOGqhDeXDWSII6VATqUAqc2FGjKHQ4MZz5WxzDFxNcfyTKTs+F2YXlR4mL+veSC4GzRhLUoSJQh1LgxI4aRaDDrRpctOCwC6Ul1WtXxdeXVMMG3aXFGuBnoi7ebXtISPrl7fFrN1LjUwmoqcU2luqHlMGO4Rup4VcPwU9CUkeukH0l+nTQ6jpoNi9w1kiCOlRE4emwd3xqLD3HloaEaHLRiS30B15FUZocukVdfqXJifiw+uDUIWQOK7kr4fbMeEvD4R6yrzQ+bjx845H4OVt+LfvP/Gd0SLaZ13lH98Gapp4JrfQQ2NQ6Cji53RDhmqcJSVYeTNJCr2EVnTVehDisTvJ5WHPqUHXPyDTeH6XJSa6ekdShusb76XB01vN8nPB/iwoRTy46sRV1FkU0uVDPQLeI5ucnQHKhxosOq09ypw4hc1jJXQm3Z7ZV1R1+cldti36Hs7Ulsac6/vQrra0JU2Aeq0OirauHyt1TWb7Ua+7fW1+/t/5Yl3FUResYIQPH6xP0IM9hFZ01XoQ4rE7yeVh5dKiu8V7DGgoBkgs13r9nnDoUSi7aeP7kLjrsn5zpNb4giga72w3+mkxyeMjWcJAW+b5De3KhQ9hSNwIkp1/lxTke9uQ8PUOCNj705AGuGdozXpUZHYo23j85gz250CE+w9paV7HzicatmyrW7rng1XhLhxlS+v3PnubGyzOMDmdHUvr90rE0mU3Dya233Sb1Sk68dch/mgGGlb9msJcC/vz25EKHWMPqo8MAyfPzpUDoELbUDZ5hlfm+w5zJnfAnd9EhpddX7044h5kimtxrYnvBefLBEE0u1DOiv/gIESC5UONFh9UneaGvDsdBXcBC+uJAevO+xGuvv/Ufr7TWtutlutggOo8btttoPtTrJ6kOm3qIVnue2FaNtbG4/m5ieXPTpnhtrKb7YM21F3Z1Zj5o4zWsorPGixCH1Uk+D6uPDimqe0a08fwESC7UeP+eKaTVIaXX9+avJKLJRSe2UGeJojS5utviRHFyIj6sPjh1mM9vMjlp3R0nfUdbF1LbXk2DBWnPUx3qLEysf+gMXR2u3rTXOkrb3Nh6uEHXIWy0JLTYDvhJDB3qe8ubtZJG0CFsj4+kjXcWdbyGVXTWeBHisDrJ52Hl0aG6xnsNaygoTU5y9YxTh0Koa7ynDvOKsCY2Uig4dVhYbNOllaxPkG37L5RuNd75q99r6DC1tWQjVaB5s3RhonRVvPRB/WvhrA+LaqW7oL4Wq4afxFodltbteQe2t+glWk3Hq2cyz+YOzhpJcuoQCYakDtWBOkTykULXYT6As0YS1KEiUIdS4MSOGqhDeXDWSII6VATqUAqc2FEDdSgPzhpJUIeKQB1KgRM7aqAO5cFZIwnqUBGoQylwYkcN1KE8OGskQR3Ks/pLpe+//yFTiDqUAid21EAdyoOzRhLUoTya+dck/vvRF1+3ClGHUmT6FAMDAwOjIOPvvvSVnh797xSiDqXQ8PfciIGrQ3lw1kiCq0N5LBdW37/dKkQdSoETO2qgDuXBWSMJ6lAeRoQU1KEUOLGjBupQHpw1kqAO5Xmr/R22CHUoCU7sqIE6lAdnjSSoQ0UUng57x6duTs+ypR5ATaG/qSqUnBgTW6i+UGMgs7rkRLC+aE8KNT5AcqH6osPqU9+pQ6EzJb7JXRE6U9GeEa0vVNkruZcOlfakV2O8UNoYIteTOXW4ko3JiVBPBkguVN+/Z5w69K/PEG5j7LjrUOgLqIjxfPyViWD9tMj3HZJM4/m/1EO0MULJResLNYYI1qeV86Qx/teYU4c+lZ34J3cSbJhE67OlHoTVGC8dCjWGCNYXqkwE66/wsPrrcIUbkxOhxihNTnLVl/m+Q5IruRP++u46JCLfEUURqi9UmXhPbC9E8wshmlx1fSFEkwvVF6pMfOs7dSiKT3JX8qq+UGXiUV901njhmtwH0fpCiCaXqe+vQyKXnAfR+kKIJheq71/ZuTr0r+9EqD5/ZU8d5hVhTWykUJDXIYKzRpKcOkSC4dRhnoA6RPIR1KE8OGskQR0qAnUoBU7sqIE6lAdnjSSoQ0UUjw4Hf5KGSO2fK+6gp7kwusSef/T4UV/nHZfevvOTs5Xd7xZxfO3qH+E0n+jvYs8/DOYPxCEWjjxY3EFPkz35MNjRO/mXH4985erYvUUdcI4QvxiYZs9fGU/feL3ss59tu/bsjr7nijg2fdYAp8mevAMxHYIhhvfNLU6SKMT46Xk4X7YLogdIYnRxLgrRPz8DJ/vm6A22C+QAQyz+/n+RmVQUYuGlHaEb8eDwDEji5hKJQlyZW4KTZbtADa3jH4AkRhcnoxA3F8ZyGlFYh05tFHHA+c7MzLC9ECX+30Tq+K1+pzmKNX59sxeMmE6H+WuQrgeHNoo44HzD7UDQw6nxeac5ijX2DU5fmphdWlJ+awr08PpYh9McxRpwvu+NX/HpWAEdzlxajJoOb704Pzo6Ojk5yfZFZKi/ftnpjOIOfTU8Osp2hAQLL251OqOIY/65DdCBIf4eGZ2loRXPDkyMjY2xHRE20Vka0vjmF08fuHHCp2NFdPhR9HR4TNchMDvL9UcNio+f9EVUhz5zRpSFY992OqOIY/7gvXTWLHL/fy9/IqjD/f0T4V6ErkRNh1uv7d8/9JpPx6IO/cLSYWQXiKhDeSKrw7B+iUQdKgJ1yIA69AvUIepQHtShJKhDRaAOGVCHfoE6RB3KgzqUBHWoCNQhg6cOe8enxtJz9hLUIYXzr8EGA/pcXf4AyVGH8qAOfYBrknmdcRJNHV67MfzJ9UG2L0KCvhSgDhn8dDg6izoMQYf8f0AWgD4Xzc9PgOQ/utbpFEZxB6cO+YcVdegDXJPM64yTaOrwiyGFOqQvBahDBhcdDkzO0G/EYL4XA3Vo7xZOr6RFvtXFnhxGgd3tBn9LgiX/3ucfO4VR3MGjQ9qNnMOKOnSFeZ3xuSYjqMOG5MilvgHQoX/P2AnwUoA6ZHDRIaUXV4cOHVI4rzkLzhdNSoAFHD8BkuPq0Av+YUUd+oCrQ9fA1aGKkNIhvncYig6FCPD2Hj8BkuN7h/KgDn3A9w5dA987VBHBdegkiA4vXbC2z7/awe71iZ5LXcOOwhUPVx1Gituow85bbEng6BkcdBZ6RYHq8OLrp52FtyWEdMhDNHUY7kXoCuqQQa0ONa1ufaxmKJmafvvp77zQv3rnGX17ksBP7aFTQ8mJR2Jxvdpu3ZRn6VGnG7RY3IpHdlc894GZretAzXqjZuk91dZTnG+ohodG1C+2NWa2qx8+krLtqn4pSSq1+IkBtoX+gToU0uGGkgdsD/+0oaRKj52vw8Oakqq6thGj/IsNNS+Zu4ywHdKtrXmcbu9aUzZ0/qUhWn718K42faO8qdv+dF5xrOn1106/ZcW+mo1QePd3f++s6RoFp8PED5bni/aD1qav6n8iVdt4gO6FElvl1srGD50Zwo2V1mHq0l2r9HO/48s72F0cocVqnIV6nGvcWr+31hb3Ve1l6wjGTi3e5Sh0jfzT4ciWe++DTi7b8oxjV+7YFYs7C62AtOdusoW54vIQW5I7bqsOU/2jk2S6Kwnb2p0N8LPrgr5NgyoQdAiu0laVwU9ThzRONzx3CTJ0PXdh+Rm1mGlBzZDoclxqptkgKrN3Zdec0GIVWQfmCtShkA41/aJ3Lyk3XqyN7W6t/PBo2+NOt9Votpf12LeWdwnqsG9wsMcWNbF4z61JZzWvKDgdQsDrrPWT6vBI0txVes/99tj2207n4eHGCusQJrW53d3s3JszPHXoCC1W5la4xVnoFVqMV9j5psO7wVj6JJpsqY23OPbmDH8dQuwo2eYs9I3LjpLccVt1CDYqOwQLQXs8bPjpzVcTWlXjm+dT7OoQxGZbGlrxyGk92zd/kzLTBtQhabgzniXdXIE6DFGHfcdrjW0PHc517zKXj3pUNdtub7Y9LqRDJrSYfQGaOwpRh+SN+pMDqbU/PUuoDpO/s3Y5ZxN7bNixwjr8WlPS3J5P0437jcWiFjcXc+syv2YxD6kILR0m/3yIlp8aZZ9Cj8kz2vYzbCE8u3F4coYtd43lpuaKPNPhZS32GN0eunWNLssyfbiRlu+r2qg/1MrpQ/v1NmrTYefxH9HCi3NGtnef0VZ9Peu5Lh86Zng3V1yGdeqQkYQ/brMOh/rSlQ/tffRHZmixhtFkRmmZ1aHVa3ZRrY7FT1xmnitpVdB8dUi9a9W0P+w6UEPNyhmowxB1CD837O20dKitqbBulnaefkLTbDdazz9pTzJ0vPaZq0aSLB2es085Gq6+dC30iYLT4f4fN9QvxwG6Ojzcae7dmbW3YW0R69CIrt/tur85BRun6uI/+0gvefQc3ZV8cZLcbGug9WHvKaO+pUPN9GVai9XZE9J4qjyuH555+MrphB5H4TWtGjbO9uuFOx0XJISteV0dxkb/e821Z01ze0Xe6jATf2ijKrp6SLfj4FFt81H9YdtjG/Z+CPXNFeTVQ+XPw+xb1qEWu8/cKLFuuo5sadbr6DEHT+QiVCsyh+hNGp2+VlOu37/tmbY3zC9usw4hHjmYgLVgJi5Z5VRgRuFRfaX4auJCD1n8oHn1PbtGx5Y/dAMCy1gw+eZY5lhfHdp3MTVRh6KEq8NfbYn/6vqc++owE31gysoj9pIqK4lxyLHvVtjXkf5xt6NJOaPgdEhmWku/YdjuG/c3dZo3Sytj36R712ffLNWKWIfGzVLw3FPd+sP3m2p2tsFGkmoPgpavi8XvildrmnmL1a5DU3KnO5in2L4u/tSnWSUQz2+t2Nk28bXMojNn/KxkueaL23Mclbc6bKmNP3NV91xm19sXF3ULljcZdy+vHtJq3x41ZLahpFzLrAJtOqx67XSrEe8xz9J34VBV04dMoXcU3HuHRqxdv/x5ltK1G6nb3jwAv1XFN3290aiTtGSWiQ5rQflwRZm1KHTcLO0wD+TWYcOd8fNZT5QjUIfBdGipjtEh/CYIq0AfHbb8/AEt/kRW4eXD2jbzUzDlz35wtxb/6VkuFw5d/xM8e5v4x1MLUYe1bxgbb9RTHbbuabA+SlP0OtS0zGLuU+O9w7aGu3YnYGPnOnM997VnDV9+2kwXZ3CFZR2eeUfwLktsM1lLtzti8UfPTdhLbhpOff4TvRqXDicnuoZSWqyitr5hQ0mZZix0qJu9Is90qOuNbrz2fUOHi5efuaw/vNi0VS+fe1tbo/uypbZ8x4kRo37WahJ02JOdZ3Rar0Zj6Pp7MK/vrrEUyxOXdQ0Lxu3X4TPv2N47PFJP3Taa0n92vUmXjObq0LZ27LAWlL/eufwRG+uDMPR60mN3x9nd1lK6ZjGHDvUr0r43Z6AORXVIw1Bd5mYmyG9Zh3NtDRXmzdLlGyDG4dMjsF134gs2p1axvL3qgb459kldA1LdVZ6tVe4oRB2uXmvYbu0Ga3VoReWd8dLvHNS3RzuhW7buOeY4PORYYR1+dEL/3VqPVdW05Le7t+hn2txFH/5ic4W+d425Cnx0nXnhrfuxvgp8pb5Go0qb76fl920/ZSa/dgYe9jueMRO65Dbw6PCTU8+fTrw/pN/CtcL/YzX5psPRm+/Rzrmr/N9oSVWcPjTveb579DF4uGGbccvUfqtzlf4ZGVj5wbYusFvvrTbKq/b+gdaEDqz6vpAIafyhIHUYakzY/4uFaJTes8tZ6B+oQyEdFkcUoA7zK1ZYh0LxVHn8lXlz2/WTonkSeadDoWhbXhrWZL3hd5ujyHS40oE6RB3KgzqUJEQdwhLwvpLqDUacTTn25k0Utg5hzZf5X8V7TmQ+JpMHgTqUCtQh6lAe1KEkYeqwQKLQdZifgTqUCtQh6lAe1KEkqENFoA4ZPHXYOz51czrrakYdUkT/CrZQfehz0frMMPkQIDl+wZMrQj2JOvSB5wKOpg4/GxwS+hPePD1pQS9g1CGDuw7pt/QxEx51aPUM/5f7iNZ3drs/QvVpZaHGoA5dEepJ1KEPPBdwNHVIv++Q8xojfD1pQSujDhncdUjcvs4NdUhx9ow/qusLIZocv+/QC/6eRB1KEk0dQgcO37rF9kV4wAWMOmTw1KET1GEEwfcO5UEdShJZHYZ4EbqCOmRAHfoF6hB1KA/qUBLUoSJQhwyoQ79AHaIO5UEdSoI6VATqkAF16BeoQ9ShPKhDSVCHikAdMgjocL5/KWo6vPn0XMR1+PyN5PX5GaczijU+nhkLXYfzjSVOZxRxzB+Iow5l4uzk/Ks3p8K9CF0BHX6eHnRqo1gDzvelm+d8OlZAhwDocOqPC05tFGvA+UZch0D80z84tVGsAS7c8fkHPhMmAKCHpZEepzaKMpZ6z4euw5Iro/ErY05tFGuA/mkHhngRuvLD/t9UJp9waqNYQ18N+3asmA7TV/T7pbd+N784Too7Jt9agDMd+XfUIQFD3PnJ2XenbqUW0kUcg/MzcKZ0aegzYQKw+M4vwRCL7zxLpm4Udyy+9Qs40/T7L9I+TKfTbF8EBQxxR+etgUUyVNTRNjkPZ7piOiTGArEp1TK8MJpaHC/iuDDdDWfaPNzm37FiOqTMTs6NvTVb3DHdO0s7jrK0tMT2QpSA0z+Zuv7rwc+LOH47mLSP+PT0NNsLcswNJ+f+9O/FHbO3Bq0O9HrFCQxchP93YOJgUcepm5O2a3B0ZmaG7QUF9M+OvHTz3NGbiSKOs6Mf2jvWa3YH0SFgT130rMxFmedAJ7D9UtSw5y8NvJqzz1HUzM3NsV0gDSiWfZriZXx8nD1/NcCViR1LCajDxcVFSDoWAebn59mTjypTU1Ns7xQjcGEvcv/FGSHgWmKfrEhR1IEkMhfhyv8Kjh1LAusQQRAEQYoJTx0OTM0sKHvDTGlyYuRni8JDaXLoFnX5IfmgsuRE8bBCZnXJifphVdfzSq8ZgsPqjeqewWvGFXWN99Rh7/jU6Gz4d/8pSpMTwe9UEkVpcugWdfmVJieKhxUyq0tOcFi9wWH1QnXPqGu80uSkYHvGRYfgXvp88LsJ5ynxf/0bk5zzN4hex5cvejGenqf54Sdss7vd4P+esADJiciEhLTQLTQ/Z88INT5Acs7GB7hmiMiw0p7Jq2uGs2dIoGHlTx5sWDl7JsCw8vcMTV6gw2olh8ZzJiciwxrgmuEfVvs1w9l4/p5ZgVd40Z7hT+6iw/TCoro5wCSHh2wNN/jPZyyt/7JJOwu22d1u8F9GAZKToHOAs2eEGh8gOWfjA1wzRGRYac/k1TXD2TMk0LDyJw82rJw9E2BY+XuGJi/QYbWSQ+M5kxORYQ1wzfAPq/2a4Ww8f8+swCu8aM/wJ3fRIYU+H1saEkqTE5HLLgBKk9MriS0NCaXJieJhHS3ku2pKe15pcoLD6o3qnlHXeKXJScH2jKcO+yam55R9WlppcmLkZ4vCQ2ly6BZ1+ZUmJ4qHFTKrS05wWL3BYfVCdc+oa7zS5KRge8ZThwiCIAgSHVCHCIIgCII6RBAEQRDUIYIgCIIA/x84bn2HCX+VmwAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,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>

[image4]: <data:image/png;base64,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>
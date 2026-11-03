# TAIKAI PASS

出場した大会を「首かけパス」風のカードとして集めるアプリ。順位に関係なく、出場した大会ごとに1枚カードが発行される。データは start.gg の公開 GraphQL API から取得する。

![LP(デスクトップ)](docs/screenshots/lp-desktop.png)

| LP | バインダー | 裏返したところ |
| --- | --- | --- |
| ![LP(スマホ)](docs/screenshots/lp-mobile.png) | ![バインダー](docs/screenshots/binder-mobile.png) | ![裏面](docs/screenshots/binder-back-mobile.png) |

スクリーンショットはすべて架空のデモデータ(`/lp/demo`・`/demo`)。

## LP

**`/lp`**(ローカルなら http://localhost:3000/lp )

- ヒーローに実際に触れるカード一覧を置き、`src/config.ts` の `LP_FEATURED_SLUG` のプレイヤーの直近 `LP_CARD_COUNT` 大会を表示する
- ビルド時に start.gg から取得して静的生成し、1日ごとに裏で作り直す(ISR)。取得に失敗したときはデモデータで表示する
- **`/lp/demo`** は同じ LP を架空データで表示する(検索エンジンには載せない)
- スクリーンショットは `npm run dev` を起動した状態で `npm run screenshots` を実行すると `docs/screenshots/` に撮り直せる(インストール済みの Google Chrome を使用)。実在の選手・大会が写らないよう、デモデータのページだけを撮る

## セットアップ

```bash
npm install
cp .env.example .env.local   # 下の環境変数を記入
npm run check-schema          # 使うフィールドが start.gg に実在するか確認
npm run dev
```

| 環境変数 | 必須 | 内容 |
| --- | --- | --- |
| `STARTGG_TOKEN` | はい | start.gg の開発者設定で発行する API トークン。大会データの取得に使う(`/demo` と `/lp/demo` だけならなくても動く) |
| `STARTGG_OAUTH_CLIENT_ID` | ログインに必要 | OAuth Client の ID |
| `STARTGG_OAUTH_CLIENT_SECRET` | ログインに必要 | OAuth Client の Secret |
| `SESSION_SECRET` | ログインに必要 | ログイン状態の署名に使う文字列。`openssl rand -base64 32` で作る |
| `LOGO_MODE` | いいえ | `allowlist` のときだけ、`LOGO_ALLOWLIST` の大会に限ってロゴを出す。それ以外(未設定を含む)は全大会で出す |

その他のコマンド: `npm test`(テスト)、`npm run typecheck`(型チェック)、`npm run screenshots`(README の画像の撮り直し)

### ページ

| パス | 内容 |
| --- | --- |
| `/` | start.gg でログインしてマイバインダー(本人のアカウントのみ) |
| `/search` | おすすめの棚(よく対戦した相手、ゲームごとの上位入賞者)と、プロフィール URL での閲覧 |
| `/following` | フォロー中のプレイヤー一覧と最近の大会(0人のときはおすすめの棚) |
| `/p/<user slug>` | 他プレイヤーのバインダー(閲覧のみ・フォロー可) |
| `/lp`、`/lp/demo` | ランディングページと、そのデモデータ版 |
| `/demo` | ダミーデータでの UI 確認(トークン不要) |
| `/privacy` | プライバシーポリシー(この端末のデータの削除ボタンあり) |

### カードの操作

- 一覧を左右にドラッグでめくる。中央のカードをタップで拡大し、拡大中に左右へドラッグで裏返す。タップで一覧に戻る
- 並び替え(開催日・成績・大会テーマ・手動)と絞り込み(地域・タイトル)を変えると、先頭のカードに戻る

## Vercel へのデプロイ

上の環境変数を Vercel に設定してデプロイする。`SESSION_SECRET` は本番用に別の文字列を作る。
LP はビルド時に start.gg を呼ぶので、トークンは初回デプロイ前に設定しておくこと(未設定だとデモデータで生成され、次の再生成まで1日残る)。
API ルートのレスポンスは `Cache-Control: s-maxage` で CDN キャッシュされる(確定済みの大会でも最大1日)。

### start.gg 側で必要なこと

公開時に必要なのは、本番 URL を Callback にした OAuth Client の用意だけ。手元でも開発を続けるなら、ローカル用とは別に作る。API トークンは今のものをそのまま使う(規約上、1製品につき1つ)。利用規約と OAuth のドキュメントには、公開時の審査や申請の記載はない。

## ログイン(start.gg OAuth)

マイバインダーは start.gg でログインした本人のアカウントだけに紐づく。他人のプロフィールを自分として登録することはできない(他プレイヤーの閲覧はログイン不要)。

1. [start.gg の開発者設定](https://start.gg/admin/profile/developer/applications)の「Create Oauth Client」で作成する
   - **Application Authorization Callback**: `<サイトのURL>/api/auth/callback`(ローカルは `http://localhost:3000/api/auth/callback`)
   - **Application URL**: 公開サイトかリポジトリの URL(`localhost` は受け付けられないことがある)
2. Client ID と Secret、`SESSION_SECRET` を環境変数に設定する

未設定でも動くが、その場合ホームのログインは「準備中」になる。要求するスコープは `user.identity` のみ。アクセストークンは本人確認にだけ使って捨て、ログイン状態は署名付き Cookie で保持する(サーバーには保存しない)。

## 構成

```
src/
  config.ts                 除外する大会・掲載停止・ロゴ方針・テーマ色・棚のゲーム・シリーズ定義(皆勤判定)
  lib/model/types.ts        ドメインモデル(PassCard など)
  lib/startgg/              GraphQL クエリ・クライアント(レート制限/再試行)・生レスポンス型
  lib/transform/            start.gg → PassCard の変換(純粋関数、テストあり)
    format.ts               シングルス判定(teamRosterSize + 変則フォーマット除外)・代表イベント選択
    region.ts               都道府県の表記ゆれ吸収 → 8地方区分
    sets.ts                 試合数・勝率(DQ除外)・使用キャラ比率・対戦相手
    topPlayers.ts           ゲームごとの棚に出す上位入賞者の選出
    theme.ts                ロゴからの代表色抽出・テーマ色一式の生成
    card.ts / stats.ts      カード組み立て・遠征/皆勤の集計
  lib/server/               API ルートから呼ぶ取得処理(sharp でロゴの色抽出)・ログイン・棚の取得
  lib/client/               スプリング・ハプティクス・並び替え/絞り込み・おすすめの集計・localStorage
  components/CardStack.tsx  一覧/拡大/裏返しのインタラクション
  components/CardFaces.tsx  表面・裏面・首ストラップ
  components/Recommendations.tsx  横スクロールの棚
  components/lp/            LP
  app/api/                  players・cards・recommendations・auth(login/callback/logout/me)
```

## 取得の流れ

1. `/api/players/:slug` … `user.tournaments` で参加大会の一覧だけを取る(軽量)
2. クライアントが大会ごとに `/api/cards/:tournamentId` を同時3本ずつ呼び、カードが1枚ずつ増えていく
3. 各カードは `tournament.events[].userEntrant` で出場イベントを特定し、タイトルごとの代表イベントだけ `entrant.paginatedSets` でセットを取る

読み込みは新しい大会から順に行う。途中で古い順に並び替えると、残りを古い大会から読み込むので、一番古い大会を長く待たない。

確定済みのカードはブラウザの localStorage にも最大7日保存し、その間は API を呼ばない。

## start.gg API 規約への対応

[START.GG APIs Terms of Use](https://www.start.gg/about/apitos)(2025年2月14日更新版)に沿って、次のようにしている。

| 規約 | 対応 |
| --- | --- |
| 表示するコンテンツに start.gg の出典を示す(2章) | 各画面に「大会データ: start.gg」、カード裏に start.gg へのリンク |
| ロゴ・商標を削除・改変しない(2章) | 大会ロゴ・タイトルアイコンは切り抜かず全体を表示(`object-fit: contain`) |
| 必要最小限のデータだけ取得、用途に必要な範囲を超えてコピーしない(2章) | 表示する項目だけをクエリ。全選手を集めた検索用DBなどは作らない |
| トークンは1製品1つ、制限を回避しない(2章) | トークン1つ。サーバー側でレート制限内に収める |
| API のデータを広告のターゲティングに使わない(2章) | 使用しない(広告を載せる場合も同様) |
| データの扱いの説明(Privacy Statement)を用意する(4章) | `/privacy` |
| 保存データは start.gg 側の訂正・削除を反映し、不要になったら消す(4章) | CDN キャッシュ最大1日、端末キャッシュ最大7日。`/privacy` から端末のデータを削除できる |

公開前に `src/config.ts` で次を設定すること。

- `CONTACT` … プライバシーポリシーに載せる問い合わせ先(未設定だと「公開前に設定してください」と表示される)
- `BLOCKED_USER_SLUGS` … 掲載停止の依頼があったプレイヤー(バインダーと LP に表示されなくなる)
- `LP_FEATURED_SLUG` … LP で紹介するプレイヤー。実在の選手を使う場合は本人の了承を取る

大会ロゴの権利は各主催者にあり、この規約では許諾されない。許可を得た大会だけにする場合は `LOGO_MODE=allowlist` を使う。

## おすすめ

**ゲームごとの棚(上位入賞者)**: `src/config.ts` の `FEATURED_GAMES` のゲームごとに、最近の国内大会のうち参加人数の多い3大会から、シングルス本戦の上位8人を出す。対戦履歴のない人でも使える。結果はサーバーと CDN に1日キャッシュするので、利用者が増えても start.gg へのリクエストは増えない(1日にゲームごと4リクエスト程度)。

**よく対戦した相手**: カードを作るときに取るセットの情報から対戦相手を集計する。追加の API リクエストは発生しない(クエリの複雑度は 1 ページあたり約 266 → 310)。

- ログインして自分のバインダーを開くと集計し、端末に保存する(最大7日)
- DQ・未決着のセットと、start.gg アカウントに紐付いていない相手は除く
- 参加者一覧を大量に取る「同じ大会の出場者」は、API 規約の最小限取得に触れやすいので候補にしない

## カードにしない大会

実際には開催されていない大会は、`src/config.ts` の `EXCLUDED_TOURNAMENT_SLUGS` に登録してカードにしない。累計の出場数や遠征の集計、フォローのタイムラインにも含めない。

| 大会 | slug | 理由 |
| --- | --- | --- |
| 篝火#258 / Kagaribi#258 | `tournament/258-kagaribi-258` | エイプリルフールのネタ大会(公式が告知済み)。start.gg 上の開催日は 1935-04-01 |

## 未実装・今後

- **公開/非公開の切り替え**: DBが必要なため未実装(本人確認はログインで可能になった)。なお start.gg 上のデータ自体は公開なので、非公開にしてもこのアプリ上での表示を抑えるだけになる
- **フォロー・手動並び順**: 現状は端末の localStorage 保存。別の端末には引き継がれない。DB導入時に移す
- **累計大会数**: `user.tournaments` の件数なので、運営として関わっただけの大会が含まれる可能性がある(カードは出場イベントを確認してから発行するので、カードの枚数とは一致しないことがある)
- **タグ名検索**: start.gg 公開 API にプレイヤー検索がないため、プロフィール URL で指定する方式
- **ログインしていないときのフォロー**: 端末に保存するだけなのでログインなしでも使える。アカウントごとに保存するならDBとログイン必須化が必要(公開までに検討)
- **皆勤判定**: start.gg にシリーズの概念がないため `src/config.ts` の `SERIES` に手動で登録する
- **予選/本戦が別イベントに分かれた大会**: 自動判定していない(代表イベントは参加者数最大のシングルス)

## ライセンス

[MIT](LICENSE)

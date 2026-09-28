// TAIKAI PASS のドメインモデル。
// start.gg の生レスポンス(src/lib/startgg/raw.ts)を src/lib/transform/* でこの形に変換する。

export type JpRegion =
  | 'hokkaido'
  | 'tohoku'
  | 'kanto'
  | 'chubu'
  | 'kinki'
  | 'chugoku'
  | 'shikoku'
  | 'kyushu_okinawa';

export const JP_REGIONS: JpRegion[] = [
  'hokkaido',
  'tohoku',
  'kanto',
  'chubu',
  'kinki',
  'chugoku',
  'shikoku',
  'kyushu_okinawa',
];

export const JP_REGION_LABEL: Record<JpRegion, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kinki: '近畿',
  chugoku: '中国',
  shikoku: '四国',
  kyushu_okinawa: '九州・沖縄',
};

export type Theme = {
  /** 裏面のベタ塗り・ストラップ */
  primary: string;
  /** 表面の背景グラデーション [上, 下] */
  gradient: [string, string];
  /** 選択時の画面背景 */
  tint: string;
  /** primary の上に載せる文字色 */
  onPrimary: string;
  /** 「大会テーマ順」ソート用の色相 0-359 */
  hue: number;
  source: 'manual' | 'logo' | 'videogame' | 'fallback';
};

export type EventFormat = 'singles' | 'doubles' | 'team' | 'squad_strike' | 'other';

export type GameRef = {
  id: string;
  name: string;
  iconUrl: string | null;
};

export type Location = {
  /** ISO 3166-1 alpha-2。オンライン大会は null */
  country: string | null;
  /** 国内大会のみ */
  region: JpRegion | null;
  prefecture: string | null;
  city: string | null;
};

export type TournamentInfo = {
  id: string;
  slug: string;
  name: string;
  url: string;
  startAt: string;
  endAt: string;
  isOnline: boolean;
  location: Location;
  /** カード表面の大アイコン。大会ロゴ → ゲームアイコンの順でフォールバック。どちらもなければ null(頭文字表示) */
  iconUrl: string | null;
  theme: Theme;
};

export type CharacterUsage = {
  id: string;
  name: string;
  games: number;
  /** 0-1 */
  ratio: number;
};

export type SubEventResult = {
  eventId: string;
  name: string;
  format: EventFormat;
  placement: number | null;
  numEntrants: number;
};

/** 裏面のタブ1つ分(1タイトル)。同タイトルの副イベント(Amateur, Squad Strike 等)は subEvents に入る */
export type EventResult = {
  eventId: string;
  eventName: string;
  entrantId: string;
  game: GameRef;
  format: EventFormat;
  /** 順位が確定しているか(event.state === COMPLETED) */
  final: boolean;
  placement: number | null;
  numEntrants: number;
  sets: { played: number; won: number; lost: number; dq: number };
  /** won / played。played = 0 なら null */
  winRate: number | null;
  /** キャラ報告が1試合もなければ null(0% と区別する) */
  characters: CharacterUsage[] | null;
  subEvents: SubEventResult[];
};

/** 1大会 × 1プレイヤー = 1枚 */
export type PassCard = {
  id: string;
  userId: string;
  tournament: TournamentInfo;
  /** 当時のエントリー名 */
  displayName: string;

  // --- ソート・絞り込み用(非正規化) ---
  date: string;
  country: string | null;
  region: JpRegion | null;
  isOnline: boolean;
  /** タイトル絞り込みの対象。変則フォーマット(Squad Strike 等)だけのタイトルは含めない */
  filterGameIds: string[];
  bestPlacement: number | null;
  /** placement / numEntrants(小さいほど上位)。規模の違う大会を比較するため */
  bestPercentile: number | null;
  themeHue: number;

  // --- 表示 ---
  /** 表面右下のミニアイコン枠を出すか(タイトル2つ以上) */
  isMultiTitle: boolean;
  /** 裏面タブ。タイトル単位 */
  results: EventResult[];
};

export type PlayerProfile = {
  userId: string;
  slug: string;
  gamerTag: string;
  prefix: string | null;
  avatarUrl: string | null;
  homeCountry: string | null;
  homeRegion: JpRegion | null;
};

export type TournamentStub = {
  id: string;
  slug: string;
  name: string;
  startAt: string;
  endAt: string;
};

/** /api/players/[slug] のレスポンス。カード本体は大会ごとに別リクエストで取る */
export type PlayerIndex = {
  player: PlayerProfile;
  tournaments: TournamentStub[];
};

export type SeriesProgress = {
  seriesId: string;
  name: string;
  attended: number;
  total: number;
  /** 最新回から遡って連続で出場している回数 */
  currentStreak: number;
  perfect: boolean;
};

export type PlayerStats = {
  totalTournaments: number;
  totalEvents: number;
  /** 居住地域(国内は8地方、海外は国)と異なる場所のオフライン大会数 */
  awayCount: number;
  countries: string[];
  regions: JpRegion[];
  series: SeriesProgress[];
};

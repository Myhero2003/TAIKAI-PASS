import type { EventFormat } from '@/lib/model/types';

/**
 * 変則フォーマットの除外リスト。
 * teamRosterSize ではシングルスと区別できないもの(1人が複数キャラを使う等)をイベント名で弾く。
 */
export const IRREGULAR_FORMAT_PATTERNS: Array<{ pattern: RegExp; format: EventFormat }> = [
  { pattern: /squad\s*strike|\bsqs\b|スクアッド|スカッド/i, format: 'squad_strike' },
  { pattern: /crew\s*battle|クルーバトル|クルー戦/i, format: 'team' },
];

/** 同タイトル内の副イベント(代表イベントに選ばない)。Amateur, Redemption など */
export const SIDE_EVENT_PATTERN =
  /amateur|redemption|side\s*event|ladder|low\s*tier|アマチュア|サイド|敗者復活|レデンプション/i;

/**
 * 大会ロゴの利用方針。
 * LOGO_MODE=allowlist のときは、ここに載っている大会 slug(例: "tournament/kagaribi-13")だけロゴを使い、
 * それ以外はゲームタイトルのアイコンにフォールバックする。
 */
export const LOGO_ALLOWLIST: string[] = [];

/** テーマカラーを手動で固定したい大会。slug → #rrggbb */
export const THEME_OVERRIDES: Record<string, string> = {};

/**
 * 皆勤判定用のシリーズ定義。start.gg にシリーズの概念はないので手動で管理する。
 * tournamentSlugs は開催順(古い → 新しい)で、未参加回も含めて全回を並べる。
 */
export const SERIES: Array<{ id: string; name: string; tournamentSlugs: string[] }> = [
  // { id: 'kagaribi', name: 'KAGARIBI', tournamentSlugs: ['tournament/kagaribi-1', 'tournament/kagaribi-2'] },
];

/**
 * 掲載停止の依頼があったプレイヤー(start.gg の user slug、"user/" は付けない)。
 * ここに載せると、そのプレイヤーのバインダーは表示されなくなる
 */
export const BLOCKED_USER_SLUGS: string[] = [];

/** プライバシーポリシーに載せる問い合わせ先(公開前に設定する) */
export const CONTACT = '@mahiro_05_02';

/** LP のショーケースに使うプレイヤー(start.gg の user slug)と表示枚数 */
export const LP_FEATURED_SLUG = '830dec1e';
export const LP_CARD_COUNT = 12;

/** ゲームタイトル既定色(ロゴから色が取れないときに使う) */
export const VIDEOGAME_COLORS: Array<{ pattern: RegExp; color: string }> = [
  { pattern: /smash.*ultimate|スマブラ.*sp/i, color: '#d6263b' },
  { pattern: /melee/i, color: '#7a3fbf' },
  { pattern: /street fighter/i, color: '#e0761d' },
  { pattern: /tekken/i, color: '#b3122e' },
  { pattern: /guilty gear/i, color: '#c21f4f' },
  { pattern: /granblue/i, color: '#1d6fd6' },
  { pattern: /rivals of aether/i, color: '#2b8a6e' },
  { pattern: /fatal fury|餓狼/i, color: '#d4a019' },
];

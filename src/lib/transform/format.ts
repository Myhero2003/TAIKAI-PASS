import { IRREGULAR_FORMAT_PATTERNS, SIDE_EVENT_PATTERN } from '@/config';
import type { EventFormat } from '@/lib/model/types';

/**
 * シングルス判定(2段階)
 * 1. teamRosterSize でチーム戦を分ける。シングルスでは teamRosterSize 自体が null のことが多いので null = 1人扱い
 * 2. ロスター1人でも Squad Strike などはシングルスではないので、イベント名の除外リストで弾く
 */
export function classifyFormat(name: string, maxPlayers: number | null | undefined): EventFormat {
  const roster = maxPlayers ?? 1;
  if (roster >= 3) return 'team';
  if (roster === 2) return 'doubles';
  for (const { pattern, format } of IRREGULAR_FORMAT_PATTERNS) {
    if (pattern.test(name)) return format;
  }
  return 'singles';
}

/** タイトル絞り込みに出すフォーマットか(Squad Strike 等の変則フォーマットは出さない) */
export function countsForGameFilter(format: EventFormat): boolean {
  return format !== 'squad_strike' && format !== 'other';
}

export function isSideEvent(name: string): boolean {
  return SIDE_EVENT_PATTERN.test(name);
}

const FORMAT_RANK: Record<EventFormat, number> = {
  singles: 0,
  doubles: 1,
  team: 2,
  squad_strike: 3,
  other: 4,
};

/**
 * 同じタイトルに複数イベントがあるとき(本戦 + Amateur + Squad Strike など)、裏面タブの代表を選ぶ。
 * シングルス > ダブルス > …、副イベントでない方、参加者が多い方の順。
 */
export function pickPrimary<T extends { name: string; format: EventFormat; numEntrants: number }>(
  events: T[],
): { primary: T; rest: T[] } {
  const sorted = [...events].sort(
    (a, b) =>
      FORMAT_RANK[a.format] - FORMAT_RANK[b.format] ||
      Number(isSideEvent(a.name)) - Number(isSideEvent(b.name)) ||
      b.numEntrants - a.numEntrants,
  );
  return { primary: sorted[0], rest: sorted.slice(1) };
}

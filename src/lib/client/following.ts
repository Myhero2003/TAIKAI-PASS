import type { TournamentStub } from '@/lib/model/types';
import type { FollowEntry } from './storage';

export type FollowedPlayer = {
  follow: FollowEntry;
  /** 新しい順。読み込み前は null */
  tournaments: TournamentStub[] | null;
};

export type TimelineRow = {
  tournament: TournamentStub;
  /** 同じ大会に出たフォロー中のプレイヤーは1行にまとめる */
  players: Array<{ follow: FollowEntry; isNew: boolean }>;
  isNew: boolean;
};

export const seenKey = (slug: string, tournamentId: string) => `${slug}:${tournamentId}`;

/**
 * まだ見ていない大会か。フォローより前の大会と、初めてこのページを開いたときの大会は NEW にしない
 */
export function isNewTournament(follow: FollowEntry, tournament: TournamentStub, seen: Set<string>): boolean {
  if (seen.size === 0 || seen.has(seenKey(follow.slug, tournament.id))) return false;
  return tournament.startAt.slice(0, 10) >= follow.followedAt.slice(0, 10);
}

/** フォロー中の全員の大会を1本の時系列にする */
export function buildTimeline(players: FollowedPlayer[], seen: Set<string>): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
  for (const { follow, tournaments } of players) {
    for (const tournament of tournaments ?? []) {
      const isNew = isNewTournament(follow, tournament, seen);
      const row = rows.get(tournament.id) ?? { tournament, players: [], isNew: false };
      row.players.push({ follow, isNew });
      row.isNew ||= isNew;
      rows.set(tournament.id, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.tournament.startAt.localeCompare(a.tournament.startAt));
}

/** 最新の大会が新しい順。読み込み中のプレイヤーは後ろに置き、順序は保つ */
export function sortByLatest(players: FollowedPlayer[]): FollowedPlayer[] {
  const latest = (p: FollowedPlayer) => p.tournaments?.[0]?.startAt ?? '';
  return [...players].sort((a, b) => latest(b).localeCompare(latest(a)));
}

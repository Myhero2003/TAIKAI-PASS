import type { CharacterUsage, Opponent } from '@/lib/model/types';
import { parseUserSlug } from '@/lib/slug';
import type { RawImage, RawSet } from '@/lib/startgg/raw';

export type SetSummary = {
  sets: { played: number; won: number; lost: number; dq: number };
  winRate: number | null;
  characters: CharacterUsage[] | null;
};

function isDq(set: RawSet): boolean {
  if (set.displayScore?.trim().toUpperCase() === 'DQ') return true;
  return (set.slots ?? []).some((slot) => slot?.standing?.stats?.score?.value === -1);
}

/**
 * エントリーのセット一覧から試合数・勝率・使用キャラ比率を出す。
 * - 未決着(winnerId なし)は数えない
 * - DQ は played から除いて dq に数える(不戦勝・不戦敗で勝率が動かないように)
 * - キャラは自分の selection だけをゲーム単位で数える
 */
export function summarizeSets(rawSets: Array<RawSet | null>, entrantId: string): SetSummary {
  let won = 0;
  let lost = 0;
  let dq = 0;
  const chars = new Map<string, { name: string; games: number }>();
  let charGames = 0;

  for (const set of rawSets) {
    if (!set || set.winnerId == null) continue;
    if (isDq(set)) {
      dq++;
      continue;
    }
    if (String(set.winnerId) === entrantId) won++;
    else lost++;

    for (const game of set.games ?? []) {
      for (const sel of game?.selections ?? []) {
        if (!sel?.character || String(sel.entrant?.id) !== entrantId) continue;
        const id = String(sel.character.id);
        const entry = chars.get(id) ?? { name: sel.character.name ?? '?', games: 0 };
        entry.games++;
        chars.set(id, entry);
        charGames++;
      }
    }
  }

  const played = won + lost;
  return {
    sets: { played, won, lost, dq },
    winRate: played > 0 ? won / played : null,
    characters:
      charGames > 0
        ? [...chars.entries()]
            .map(([id, c]) => ({ id, name: c.name, games: c.games, ratio: c.games / charGames }))
            .sort((a, b) => b.games - a.games)
        : null,
  };
}

export function profileImage(images: RawImage[] | null | undefined): string | null {
  return images?.find((i) => i.type === 'profile' && i.url)?.url ?? null;
}

/**
 * 実際に対戦した相手を集計する(おすすめ用)。
 * DQ・未決着は対戦していないので除く。start.gg アカウントに紐付いていない相手はプロフィールを開けないので除く。
 */
export function collectOpponents(rawSets: Array<RawSet | null>, entrantId: string): Opponent[] {
  const bySlug = new Map<string, Opponent>();
  for (const set of rawSets) {
    if (!set || set.winnerId == null || isDq(set)) continue;
    for (const slot of set.slots ?? []) {
      if (!slot?.entrant || String(slot.entrant.id) === entrantId) continue;
      for (const p of slot.entrant.participants ?? []) {
        const slug = parseUserSlug(p?.user?.slug ?? '');
        if (!p || !slug) continue;
        const prev = bySlug.get(slug);
        bySlug.set(slug, {
          slug,
          gamerTag: p.gamerTag || slug,
          prefix: p.prefix || null,
          avatarUrl: profileImage(p.user?.images),
          sets: (prev?.sets ?? 0) + 1,
        });
      }
    }
  }
  return [...bySlug.values()];
}

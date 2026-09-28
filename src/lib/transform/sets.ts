import type { CharacterUsage } from '@/lib/model/types';
import type { RawSet } from '@/lib/startgg/raw';

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

import type { TopPlayer } from '@/lib/model/types';
import { parseUserSlug } from '@/lib/slug';
import type { RawTopEvent } from '@/lib/startgg/raw';
import { classifyFormat, pickPrimary } from './format';
import { profileImage } from './sets';

export const MAX_TOP_PLAYERS = 12;

export type TopTournamentInput = {
  name: string;
  slug: string;
  startAt: string;
  events: RawTopEvent[];
};

/**
 * 大会の順位から「上位入賞者」を選ぶ。
 * シングルスの本戦だけを対象にし(結果が確定しているもの)、同じ人は一番良い順位だけ残す。
 * start.gg アカウントに紐付いていない人はプロフィールを開けないので除く。
 */
export function pickTopPlayers(tournaments: TopTournamentInput[]): TopPlayer[] {
  const bySlug = new Map<string, TopPlayer>();

  for (const t of tournaments) {
    const singles = t.events
      .filter((e) => e.state === 'COMPLETED')
      .map((e) => ({
        event: e,
        name: e.name ?? '',
        numEntrants: e.numEntrants ?? 0,
        format: classifyFormat(e.name ?? '', e.teamRosterSize?.maxPlayers),
      }))
      .filter((e) => e.format === 'singles');
    if (singles.length === 0) continue;

    const { primary } = pickPrimary(singles);
    for (const standing of primary.event.standings?.nodes ?? []) {
      const participant = standing?.entrant?.participants?.[0];
      const slug = parseUserSlug(participant?.user?.slug ?? '');
      if (!standing?.placement || !participant || !slug) continue;

      const prev = bySlug.get(slug);
      if (prev && prev.placement <= standing.placement) continue;
      bySlug.set(slug, {
        slug,
        gamerTag: participant.gamerTag || slug,
        prefix: participant.prefix || null,
        avatarUrl: profileImage(participant.user?.images),
        placement: standing.placement,
        tournamentName: t.name,
        numEntrants: primary.numEntrants,
      });
    }
  }

  return [...bySlug.values()]
    .sort((a, b) => a.placement - b.placement || b.numEntrants - a.numEntrants)
    .slice(0, MAX_TOP_PLAYERS);
}

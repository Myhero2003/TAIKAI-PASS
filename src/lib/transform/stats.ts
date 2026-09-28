import { SERIES } from '@/config';
import type { JpRegion, PassCard, PlayerProfile, PlayerStats, SeriesProgress } from '@/lib/model/types';

type SeriesDef = { id: string; name: string; tournamentSlugs: string[] };

/** 大会単位の実績(累計出場・遠征・皆勤) */
export function computeStats(
  cards: PassCard[],
  player: Pick<PlayerProfile, 'homeCountry' | 'homeRegion'>,
  series: SeriesDef[] = SERIES,
): PlayerStats {
  const countries = new Set<string>();
  const regions = new Set<JpRegion>();
  let awayCount = 0;
  let totalEvents = 0;

  for (const card of cards) {
    totalEvents += card.results.reduce((n, r) => n + 1 + r.subEvents.length, 0);
    if (card.isOnline) continue;
    if (card.country) countries.add(card.country);
    if (card.region) regions.add(card.region);
    if (isAway(card, player)) awayCount++;
  }

  const attendedSlugs = new Set(cards.map((c) => c.tournament.slug));
  const seriesProgress: SeriesProgress[] = series
    .map((s) => {
      const flags = s.tournamentSlugs.map((slug) => attendedSlugs.has(slug));
      const attended = flags.filter(Boolean).length;
      let currentStreak = 0;
      for (let i = flags.length - 1; i >= 0 && flags[i]; i--) currentStreak++;
      return {
        seriesId: s.id,
        name: s.name,
        attended,
        total: flags.length,
        currentStreak,
        perfect: attended > 0 && attended === flags.length,
      };
    })
    .filter((s) => s.attended > 0);

  return {
    totalTournaments: cards.length,
    totalEvents,
    awayCount,
    countries: [...countries].sort(),
    regions: [...regions],
    series: seriesProgress,
  };
}

function isAway(card: PassCard, home: Pick<PlayerProfile, 'homeCountry' | 'homeRegion'>): boolean {
  if (!home.homeCountry || !card.country) return false;
  if (card.country !== home.homeCountry) return true;
  return card.country === 'JP' && !!home.homeRegion && !!card.region && card.region !== home.homeRegion;
}

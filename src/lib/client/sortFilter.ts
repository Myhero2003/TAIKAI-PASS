import { JP_REGIONS, type GameRef, type JpRegion, type PassCard } from '@/lib/model/types';

export type SortKey = 'date_desc' | 'date_asc' | 'result' | 'theme' | 'manual';

export const SORT_LABEL: Record<SortKey, string> = {
  date_desc: '開催日(新しい順)',
  date_asc: '開催日(古い順)',
  result: '成績順',
  theme: '大会テーマ順',
  manual: '手動',
};

/** area: '' = すべて / 'jp:<region>' / 'country:<ISO>' / 'online' */
export type Filter = { area: string; game: string };

export const EMPTY_FILTER: Filter = { area: '', game: '' };

function matchesArea(card: PassCard, area: string): boolean {
  if (!area) return true;
  if (area === 'online') return card.isOnline;
  if (area.startsWith('jp:')) return card.country === 'JP' && card.region === area.slice(3);
  if (area.startsWith('country:')) return card.country === area.slice(8);
  return true;
}

function bestWinRate(card: PassCard): number {
  return Math.max(-1, ...card.results.map((r) => r.winRate ?? -1));
}

export function applySortFilter(
  cards: PassCard[],
  sort: SortKey,
  filter: Filter,
  manualOrder: string[] = [],
): PassCard[] {
  const list = cards.filter(
    (c) => matchesArea(c, filter.area) && (!filter.game || c.filterGameIds.includes(filter.game)),
  );
  const byDateDesc = (a: PassCard, b: PassCard) => b.date.localeCompare(a.date);

  switch (sort) {
    case 'date_desc':
      return list.sort(byDateDesc);
    case 'date_asc':
      return list.sort((a, b) => a.date.localeCompare(b.date));
    case 'result':
      return list.sort(
        (a, b) =>
          (a.bestPercentile ?? Infinity) - (b.bestPercentile ?? Infinity) ||
          bestWinRate(b) - bestWinRate(a) ||
          byDateDesc(a, b),
      );
    case 'theme':
      return list.sort((a, b) => a.themeHue - b.themeHue || byDateDesc(a, b));
    case 'manual': {
      // 並び順に無いカード(新しく増えたもの)は先頭に日付順で
      const rank = new Map(manualOrder.map((id, i) => [id, i]));
      return list.sort((a, b) => {
        const ra = rank.get(a.tournament.id) ?? -1;
        const rb = rank.get(b.tournament.id) ?? -1;
        return ra - rb || byDateDesc(a, b);
      });
    }
  }
}

export type FilterOptions = {
  regions: JpRegion[];
  countries: string[];
  hasOnline: boolean;
  games: GameRef[];
};

export function filterOptions(cards: PassCard[]): FilterOptions {
  const regions = new Set<JpRegion>();
  const countries = new Set<string>();
  const games = new Map<string, GameRef>();
  let hasOnline = false;
  for (const c of cards) {
    if (c.isOnline) hasOnline = true;
    else if (c.country === 'JP' && c.region) regions.add(c.region);
    else if (c.country && c.country !== 'JP') countries.add(c.country);
    for (const r of c.results) {
      if (c.filterGameIds.includes(r.game.id)) games.set(r.game.id, r.game);
    }
  }
  return {
    regions: JP_REGIONS.filter((r) => regions.has(r)),
    countries: [...countries].sort(),
    hasOnline,
    games: [...games.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string): string {
  try {
    regionNames ??= new Intl.DisplayNames(['ja'], { type: 'region' });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

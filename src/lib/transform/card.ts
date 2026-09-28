import type { EventFormat, EventResult, GameRef, Location, PassCard, Theme } from '@/lib/model/types';
import type { RawImage, RawSet, RawTournament, RawVideogame } from '@/lib/startgg/raw';
import { classifyFormat, countsForGameFilter, pickPrimary } from './format';
import { normalizeCountry, resolveJpLocation } from './region';
import { summarizeSets } from './sets';

export function pickImage(images: RawImage[] | null | undefined, preferType: string): string | null {
  const list = (images ?? []).filter((i): i is { url: string; type: string | null } => !!i?.url);
  return (list.find((i) => i.type === preferType) ?? list[0])?.url ?? null;
}

export function unixToIso(sec: number | null | undefined): string {
  return new Date((sec ?? 0) * 1000).toISOString();
}

export function resolveLocation(t: RawTournament): Location {
  if (t.isOnline) return { country: null, region: null, prefecture: null, city: null };
  const country = normalizeCountry(t.countryCode);
  const jp = country === 'JP' ? resolveJpLocation(t) : { region: null, prefecture: null };
  return { country, region: jp.region, prefecture: jp.prefecture, city: t.city ?? null };
}

function toGameRef(v: RawVideogame | null): GameRef {
  return {
    id: String(v?.id ?? 'unknown'),
    name: v?.displayName || v?.name || 'Unknown',
    iconUrl: pickImage(v?.images, 'primary'),
  };
}

/** そのユーザーが出場したイベント1つ分 */
export type Entry = {
  eventId: string;
  name: string;
  entrantId: string;
  entrantName: string | null;
  game: GameRef;
  format: EventFormat;
  final: boolean;
  placement: number | null;
  numEntrants: number;
};

/** userEntrant があるイベントだけを取り出す(運営として関わっただけの大会は空になる) */
export function toEntries(t: RawTournament): Entry[] {
  return (t.events ?? []).flatMap((e) =>
    e.userEntrant
      ? [
          {
            eventId: String(e.id),
            name: e.name ?? '',
            entrantId: String(e.userEntrant.id),
            entrantName: e.userEntrant.name,
            game: toGameRef(e.videogame),
            format: classifyFormat(e.name ?? '', e.teamRosterSize?.maxPlayers),
            final: e.state === 'COMPLETED',
            placement: e.userEntrant.standing?.placement ?? null,
            numEntrants: e.numEntrants ?? 0,
          },
        ]
      : [],
  );
}

/** タイトルごとにまとめ、代表イベント(裏面タブに出すもの)と副イベントに分ける */
export function groupByGame(entries: Entry[]): Array<{ primary: Entry; rest: Entry[]; all: Entry[] }> {
  const byGame = new Map<string, Entry[]>();
  for (const entry of entries) {
    byGame.set(entry.game.id, [...(byGame.get(entry.game.id) ?? []), entry]);
  }
  return [...byGame.values()].map((all) => ({ ...pickPrimary(all), all }));
}

export type BuildCardInput = {
  userId: string;
  fallbackName: string;
  tournament: RawTournament;
  /** 代表イベントの entrantId → セット一覧 */
  setsByEntrant: Map<string, Array<RawSet | null>>;
  theme: Theme;
  useLogo: boolean;
};

/** 大会1つ分の生データからカード1枚を作る。出場イベントがなければ null */
export function buildCard(input: BuildCardInput): PassCard | null {
  const { tournament: t, userId } = input;
  const entries = toEntries(t);
  if (entries.length === 0) return null;

  const groups = groupByGame(entries);
  const results: EventResult[] = groups.map(({ primary, rest }) => ({
    eventId: primary.eventId,
    eventName: primary.name,
    entrantId: primary.entrantId,
    game: primary.game,
    format: primary.format,
    final: primary.final,
    placement: primary.placement,
    numEntrants: primary.numEntrants,
    ...summarizeSets(input.setsByEntrant.get(primary.entrantId) ?? [], primary.entrantId),
    subEvents: rest.map((r) => ({
      eventId: r.eventId,
      name: r.name,
      format: r.format,
      placement: r.placement,
      numEntrants: r.numEntrants,
    })),
  }));
  // タブ順: シングルス優先、規模の大きい順
  results.sort(
    (a, b) => Number(a.format !== 'singles') - Number(b.format !== 'singles') || b.numEntrants - a.numEntrants,
  );

  const filterGameIds = groups
    .filter((g) => g.all.some((e) => countsForGameFilter(e.format)))
    .map((g) => g.primary.game.id);

  let bestPlacement: number | null = null;
  let bestPercentile: number | null = null;
  for (const r of results) {
    if (r.placement == null || r.numEntrants <= 0) continue;
    const pct = r.placement / r.numEntrants;
    if (bestPercentile == null || pct < bestPercentile) bestPercentile = pct;
    if (bestPlacement == null || r.placement < bestPlacement) bestPlacement = r.placement;
  }

  const singlesName = entries.find((e) => e.format === 'singles')?.entrantName;
  const location = resolveLocation(t);
  const logoUrl = input.useLogo ? pickImage(t.images, 'profile') : null;
  const date = unixToIso(t.startAt);

  return {
    id: `${userId}:${t.id}`,
    userId,
    tournament: {
      id: String(t.id),
      slug: t.slug ?? '',
      name: t.name ?? '',
      url: t.slug ? `https://www.start.gg/${t.slug}` : 'https://www.start.gg',
      startAt: date,
      endAt: unixToIso(t.endAt ?? t.startAt),
      isOnline: !!t.isOnline,
      location,
      iconUrl: logoUrl ?? results[0].game.iconUrl,
      theme: input.theme,
    },
    displayName: singlesName || input.fallbackName,
    date,
    country: location.country,
    region: location.region,
    isOnline: !!t.isOnline,
    filterGameIds,
    bestPlacement,
    bestPercentile,
    themeHue: input.theme.hue,
    isMultiTitle: results.length >= 2,
    results,
  };
}

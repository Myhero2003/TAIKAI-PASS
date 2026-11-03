import 'server-only';
import { BLOCKED_USER_SLUGS, EXCLUDED_TOURNAMENT_SLUGS, LOGO_ALLOWLIST } from '@/config';
import type { PassCard, PlayerIndex, TournamentStub } from '@/lib/model/types';
import { gql, StartggError } from '@/lib/startgg/client';
import { ENTRANT_SETS, PLAYER_INDEX, TOURNAMENT_FOR_USER } from '@/lib/startgg/queries';
import type { RawEntrantSets, RawPlayerIndexPage, RawSet, RawTournamentForUser } from '@/lib/startgg/raw';
import { buildCard, groupByGame, pickImage, toEntries, unixToIso } from '@/lib/transform/card';
import { pickPrimary } from '@/lib/transform/format';
import { findPrefecture, normalizeCountry } from '@/lib/transform/region';
import { resolveTheme } from './theme';

const INDEX_PER_PAGE = 50;
const INDEX_MAX_PAGES = 20;
const SETS_PER_PAGE = 20; // games > selections まで取るので小さめにして複雑度制限に収める
const SETS_MAX_PAGES = 10;

/** Step 1: プレイヤー情報と参加大会一覧 */
export async function fetchPlayerIndex(slug: string): Promise<PlayerIndex> {
  if (BLOCKED_USER_SLUGS.includes(slug)) {
    throw new StartggError('このプレイヤーのバインダーは表示できません', 404);
  }
  const userSlug = `user/${slug}`;
  let page = 1;
  let totalPages = 1;
  let first: NonNullable<RawPlayerIndexPage['user']> | null = null;
  const tournaments = new Map<string, TournamentStub>();

  do {
    const data = await gql<RawPlayerIndexPage>(PLAYER_INDEX, { slug: userSlug, page, perPage: INDEX_PER_PAGE });
    const user = data.user;
    if (!user) throw new StartggError('start.gg にそのプレイヤーが見つかりません', 404);
    first ??= user;
    totalPages = Math.min(user.tournaments?.pageInfo?.totalPages ?? 1, INDEX_MAX_PAGES);
    for (const node of user.tournaments?.nodes ?? []) {
      if (!node || EXCLUDED_TOURNAMENT_SLUGS.includes(node.slug ?? '')) continue;
      const id = String(node.id);
      tournaments.set(id, {
        id,
        slug: node.slug ?? '',
        name: node.name ?? '',
        startAt: unixToIso(node.startAt),
        endAt: unixToIso(node.endAt ?? node.startAt),
        iconUrl: logoAllowed(node.slug) ? pickImage(node.images, 'profile') : null,
      });
    }
    page++;
  } while (page <= totalPages);

  const user = first!;
  const homeCountry = normalizeCountry(user.location?.country);
  return {
    player: {
      userId: String(user.id),
      slug,
      gamerTag: user.player?.gamerTag ?? slug,
      prefix: user.player?.prefix || null,
      avatarUrl: pickImage(user.images, 'profile'),
      homeCountry,
      homeRegion: homeCountry === 'JP' ? (findPrefecture(user.location?.state)?.region ?? null) : null,
    },
    tournaments: [...tournaments.values()].sort((a, b) => b.startAt.localeCompare(a.startAt)),
  };
}

async function fetchAllSets(entrantId: string): Promise<Array<RawSet | null>> {
  const sets: Array<RawSet | null> = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await gql<RawEntrantSets>(ENTRANT_SETS, { entrantId, page, perPage: SETS_PER_PAGE });
    const paginated = data.entrant?.paginatedSets;
    sets.push(...(paginated?.nodes ?? []));
    totalPages = Math.min(paginated?.pageInfo?.totalPages ?? 1, SETS_MAX_PAGES);
    page++;
  } while (page <= totalPages);
  return sets;
}

function logoAllowed(slug: string | null): boolean {
  if (process.env.LOGO_MODE !== 'allowlist') return true;
  return !!slug && LOGO_ALLOWLIST.includes(slug);
}

export type CardResult = {
  card: PassCard | null;
  /** 全イベント確定済みで、今後変わらない */
  settled: boolean;
};

/** Step 2 + 3: 大会1つ分のカード */
export async function fetchCard(tournamentId: string, userId: string, fallbackName: string): Promise<CardResult> {
  const data = await gql<RawTournamentForUser>(TOURNAMENT_FOR_USER, { id: tournamentId, userId });
  const t = data.tournament;
  if (!t) throw new StartggError('大会が見つかりません', 404);
  if (EXCLUDED_TOURNAMENT_SLUGS.includes(t.slug ?? '')) return { card: null, settled: true };

  const groups = groupByGame(toEntries(t));
  if (groups.length === 0) return { card: null, settled: true };

  // セットを取るのは各タイトルの代表イベントだけ(副イベントは順位のみ表示)
  const setsByEntrant = new Map<string, Array<RawSet | null>>();
  for (const { primary } of groups) {
    setsByEntrant.set(primary.entrantId, await fetchAllSets(primary.entrantId));
  }

  const mainGame = pickPrimary(groups.map((g) => g.primary)).primary.game;
  const theme = await resolveTheme(t, mainGame);
  const card = buildCard({
    userId,
    fallbackName,
    tournament: t,
    setsByEntrant,
    theme,
    useLogo: logoAllowed(t.slug),
  });
  if (card) card.opponents = card.opponents.filter((o) => !BLOCKED_USER_SLUGS.includes(o.slug));
  const ended = (t.endAt ?? 0) * 1000 < Date.now() - 2 * 24 * 3600 * 1000;
  return { card, settled: ended && groups.every((g) => g.all.every((e) => e.final)) };
}

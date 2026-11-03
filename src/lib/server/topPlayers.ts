import 'server-only';
import { unstable_cache } from 'next/cache';
import { BLOCKED_USER_SLUGS, FEATURED_GAMES } from '@/config';
import type { GameShelf } from '@/lib/model/types';
import { gql } from '@/lib/startgg/client';
import { TOP_TOURNAMENTS, TOURNAMENT_TOP_STANDINGS } from '@/lib/startgg/queries';
import type { RawTopStandings, RawTopTournaments } from '@/lib/startgg/raw';
import { unixToIso } from '@/lib/transform/card';
import { pickTopPlayers } from '@/lib/transform/topPlayers';

/** 直近の大会を何件見るか。参加人数はこの中で比べる */
const RECENT_TOURNAMENTS = 100;
/** 順位を見に行く大会の数(ゲームごと) */
const LARGEST_TOURNAMENTS = 3;
/** 小さな大会の入賞者は「おすすめ」としては弱いので除く */
const MIN_ATTENDEES = 16;
/** これより古い大会は使わない(大会の少ないゲームで昔の結果が出続けないように) */
const MAX_AGE_DAYS = 180;

async function loadShelf(gameId: string): Promise<Omit<GameShelf, 'name'>> {
  const afterDate = Math.floor((Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000) / 1000);
  const { tournaments, videogame } = await gql<RawTopTournaments>(TOP_TOURNAMENTS, {
    videogameId: gameId,
    perPage: RECENT_TOURNAMENTS,
    afterDate,
  });

  const largest = (tournaments?.nodes ?? [])
    .flatMap((t) => (t?.numAttendees && t.numAttendees >= MIN_ATTENDEES ? [t] : []))
    .sort((a, b) => (b.numAttendees ?? 0) - (a.numAttendees ?? 0))
    .slice(0, LARGEST_TOURNAMENTS);

  const inputs = await Promise.all(
    largest.map(async (t) => {
      const data = await gql<RawTopStandings>(TOURNAMENT_TOP_STANDINGS, { id: t.id, videogameId: gameId });
      return {
        name: t.name ?? '',
        slug: t.slug ?? '',
        startAt: unixToIso(t.startAt),
        events: data.tournament?.events ?? [],
      };
    }),
  );

  const images = (videogame?.images ?? []).filter((i) => i.url);
  return {
    id: gameId,
    iconUrl: (images.find((i) => i.type === 'primary') ?? images[0])?.url ?? null,
    players: pickTopPlayers(inputs),
  };
}

// 失敗時は例外になりキャッシュされない。利用者が増えても start.gg へのリクエストは増えない
const cachedShelf = unstable_cache(loadShelf, ['top-players-v1'], { revalidate: 86400 });

/** ゲームごとの棚。取得できなかったゲームと、入賞者がいないゲームは出さない */
export async function getGameShelves(): Promise<{ shelves: GameShelf[]; complete: boolean }> {
  const results = await Promise.allSettled(FEATURED_GAMES.map((g) => cachedShelf(g.id)));
  const shelves: GameShelf[] = [];
  let complete = true;

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      complete = false;
      console.error(`[recommendations] ${FEATURED_GAMES[i].name} の取得に失敗しました`, r.reason);
      return;
    }
    const players = r.value.players.filter((p) => !BLOCKED_USER_SLUGS.includes(p.slug));
    if (players.length > 0) shelves.push({ ...r.value, name: FEATURED_GAMES[i].name, players });
  });

  return { shelves, complete };
}

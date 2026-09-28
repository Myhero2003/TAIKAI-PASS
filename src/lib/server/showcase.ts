import 'server-only';
import { unstable_cache } from 'next/cache';
import { LP_CARD_COUNT } from '@/config';
import { DEMO_CARDS, DEMO_PLAYER } from '@/lib/mock';
import type { PassCard, PlayerProfile } from '@/lib/model/types';
import { fetchCard, fetchPlayerIndex } from './player';

export type Showcase = {
  player: PlayerProfile;
  cards: PassCard[];
  /** 累計出場大会数 */
  total: number;
  /** 直近1年の出場大会数 */
  lastYear: number;
  /** 最初に出場した年 */
  sinceYear: number | null;
  source: 'startgg' | 'demo';
};

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function load(slug: string): Promise<Showcase> {
  const { player, tournaments } = await fetchPlayerIndex(slug);
  // 運営のみで出場していない大会はカードにならないので、少し多めに取る
  const recent = tournaments.slice(0, LP_CARD_COUNT + 4);
  const cards = await mapLimit(recent, 4, (t) =>
    fetchCard(t.id, player.userId, player.gamerTag)
      .then((r) => r.card)
      .catch(() => null),
  );
  const yearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();
  const oldest = tournaments.at(-1)?.startAt;
  return {
    player,
    cards: cards.filter((c): c is PassCard => c !== null).slice(0, LP_CARD_COUNT),
    total: tournaments.length,
    lastYear: tournaments.filter((t) => t.startAt >= yearAgo).length,
    sinceYear: oldest ? new Date(oldest).getFullYear() : null,
    source: 'startgg',
  };
}

// 失敗時は例外を投げてキャッシュさせない(デモデータが1日残らないように)
const cachedLoad = unstable_cache(load, ['lp-showcase-v1'], { revalidate: 86400 });

export async function getShowcase(slug: string): Promise<Showcase> {
  try {
    const showcase = await cachedLoad(slug);
    if (showcase.cards.length > 0) return showcase;
  } catch (e) {
    console.error('[lp] start.gg から取得できなかったためデモデータを表示します', e);
  }
  return demoShowcase();
}

/** 架空の大会・プレイヤーでの LP。README のスクリーンショットにも使う */
export function demoShowcase(): Showcase {
  return {
    player: DEMO_PLAYER,
    cards: DEMO_CARDS,
    total: DEMO_CARDS.length,
    lastYear: DEMO_CARDS.length,
    sinceYear: 2025,
    source: 'demo',
  };
}

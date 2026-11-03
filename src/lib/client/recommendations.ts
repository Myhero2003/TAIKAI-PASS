import type { PassCard } from '@/lib/model/types';

export type Recommendation = {
  slug: string;
  gamerTag: string;
  prefix: string | null;
  avatarUrl: string | null;
  /** 対戦したセット数 */
  sets: number;
  /** 最後に対戦した大会の日付 */
  lastPlayedAt: string;
};

/** 保存しておく件数(フォロー済みを除いても表示が足りるように多めに持つ) */
const KEEP = 40;

/** カードの対戦相手を集計して、よく対戦した順に並べる。同数なら最近対戦した人が先 */
export function buildRecommendations(cards: PassCard[]): Recommendation[] {
  const byDateAsc = [...cards].sort((a, b) => a.date.localeCompare(b.date));
  const bySlug = new Map<string, Recommendation>();

  for (const card of byDateAsc) {
    // API の CDN キャッシュに残っている古い形式のカードには opponents がない
    for (const o of card.opponents ?? []) {
      const prev = bySlug.get(o.slug);
      // 日付の古い順に見ているので、名前とアイコンは最新の大会のものが残る
      bySlug.set(o.slug, {
        slug: o.slug,
        gamerTag: o.gamerTag,
        prefix: o.prefix,
        avatarUrl: o.avatarUrl,
        sets: (prev?.sets ?? 0) + o.sets,
        lastPlayedAt: card.date,
      });
    }
  }

  return [...bySlug.values()]
    .sort((a, b) => b.sets - a.sets || b.lastPlayedAt.localeCompare(a.lastPlayedAt))
    .slice(0, KEEP);
}

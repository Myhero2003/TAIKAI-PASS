// localStorage のラッパー。プライベートモード等で使えなくても落ちないようにする。
// ログイン/DB を入れるまでは、自分の slug・フォロー・手動並び順・確定済みカードのキャッシュをここに置く。

import type { PassCard } from '@/lib/model/types';
import type { Recommendation } from './recommendations';

const PREFIX = 'tp:';
// カードの形が変わったら数字を上げる(古いキャッシュは pruneCards で消える)
const CARD_PREFIX = 'tp:card:v3:';
/**
 * 確定済みカードを端末に置いておく期間。
 * start.gg API 規約上、start.gg 側の訂正・削除を反映させる必要があるので無期限にはしない
 */
export const CARD_TTL_DAYS = 7;
const CARD_TTL_MS = CARD_TTL_DAYS * 24 * 3600 * 1000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 容量超過・無効化時は保存しない
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 何もしない
  }
}

function keys(): string[] {
  try {
    return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(
      (k): k is string => !!k?.startsWith(PREFIX),
    );
  } catch {
    return [];
  }
}

type CachedCard = { card: PassCard | null; savedAt: number };
type SavedRecommendations = { userId: string; cardCount: number; items: Recommendation[]; savedAt: number };

export type FollowEntry = {
  slug: string;
  gamerTag: string;
  prefix?: string | null;
  avatarUrl?: string | null;
  followedAt: string;
};

export function toFollowEntry(p: Pick<FollowEntry, 'slug' | 'gamerTag' | 'prefix' | 'avatarUrl'>): FollowEntry {
  return {
    slug: p.slug,
    gamerTag: p.gamerTag,
    prefix: p.prefix,
    avatarUrl: p.avatarUrl,
    followedAt: new Date().toISOString(),
  };
}

export const storage = {
  getFollowing: () => read<FollowEntry[]>('tp:following', []),
  setFollowing: (list: FollowEntry[]) => write('tp:following', list),

  getManualOrder: (userId: string) => read<string[]>(`tp:order:${userId}`, []),
  setManualOrder: (userId: string, ids: string[]) => write(`tp:order:${userId}`, ids),

  /**
   * 本人のものだけ返す(同じ端末で別の人がログインしても出さない)。期限はカードのキャッシュと同じ。
   * null はまだ集計していない状態(空配列は「集計したが対戦相手がいない」)
   */
  getRecommendations: (userId: string): Recommendation[] | null => {
    const saved = read<SavedRecommendations | null>('tp:recs', null);
    if (!saved || saved.userId !== userId) return null;
    if (Date.now() - saved.savedAt > CARD_TTL_MS) {
      remove('tp:recs');
      return null;
    }
    return saved.items;
  },
  /**
   * 読み込み途中で候補が減って見えないよう、前回より多くのカードを見たとき(または全部読み終えたとき)だけ更新する
   */
  saveRecommendations: (userId: string, items: Recommendation[], cardCount: number, complete: boolean) => {
    const saved = read<SavedRecommendations | null>('tp:recs', null);
    const sameUser = saved?.userId === userId;
    if (sameUser && !complete && cardCount < (saved?.cardCount ?? 0)) return;
    write('tp:recs', { userId, cardCount, items, savedAt: Date.now() } satisfies SavedRecommendations);
  },

  getSeen: () => read<string[]>('tp:seen', []),
  setSeen: (ids: string[]) => write('tp:seen', ids.slice(-2000)),

  /** 期限切れ・未保存なら undefined(null は「出場イベントなし」として保存済み) */
  getCard: (userId: string, tournamentId: string): PassCard | null | undefined => {
    const key = `${CARD_PREFIX}${userId}:${tournamentId}`;
    const entry = read<CachedCard | null>(key, null);
    if (!entry) return undefined;
    if (Date.now() - entry.savedAt > CARD_TTL_MS) {
      remove(key);
      return undefined;
    }
    return entry.card;
  },
  setCard: (userId: string, tournamentId: string, card: PassCard | null) =>
    write(`${CARD_PREFIX}${userId}:${tournamentId}`, { card, savedAt: Date.now() } satisfies CachedCard),

  /** 期限切れのカードと、旧形式のキャッシュを消す */
  pruneCards: () => {
    remove('tp:me'); // ログイン導入前の「自分のプロフィール」設定。本人確認されていないので使わない
    for (const key of keys()) {
      if (!key.startsWith('tp:card:')) continue;
      if (!key.startsWith(CARD_PREFIX)) {
        remove(key);
        continue;
      }
      const entry = read<CachedCard | null>(key, null);
      if (!entry || Date.now() - entry.savedAt > CARD_TTL_MS) remove(key);
    }
  },

  /** この端末に保存した TAIKAI PASS のデータをすべて消す */
  clearAll: () => {
    for (const key of keys()) remove(key);
  },
};

// localStorage のラッパー。プライベートモード等で使えなくても落ちないようにする。
// ログイン/DB を入れるまでは、自分の slug・フォロー・手動並び順・確定済みカードのキャッシュをここに置く。

import type { PassCard } from '@/lib/model/types';

const PREFIX = 'tp:';
const CARD_PREFIX = 'tp:card:v2:';
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

export type FollowEntry = { slug: string; gamerTag: string; followedAt: string };

export const storage = {
  getMe: () => read<string | null>('tp:me', null),
  setMe: (slug: string | null) => write('tp:me', slug),

  getFollowing: () => read<FollowEntry[]>('tp:following', []),
  setFollowing: (list: FollowEntry[]) => write('tp:following', list),

  getManualOrder: (userId: string) => read<string[]>(`tp:order:${userId}`, []),
  setManualOrder: (userId: string, ids: string[]) => write(`tp:order:${userId}`, ids),

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

'use client';

import { useEffect, useState } from 'react';
import type { PassCard, PlayerIndex, PlayerProfile } from '@/lib/model/types';
import { storage } from './storage';

export type PlayerCardsState = {
  status: 'loading' | 'ready' | 'error';
  player: PlayerProfile | null;
  cards: PassCard[];
  /** 参加大会の総数 / 処理済み数(カードが1枚ずつ発行されていく進捗) */
  total: number;
  done: number;
  failed: number;
  error: string | null;
};

const CONCURRENCY = 3;

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal });
    if (res.ok) return (await res.json()) as T;
    // サーバー側でも再試行しているが、それでも混んでいたら少し待ってもう一度
    if ((res.status === 503 || res.status === 429) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
      continue;
    }
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

/** プレイヤーの参加大会一覧を取り、カードを大会ごとに順次取得する */
export function usePlayerCards(slug: string | null): PlayerCardsState {
  const [state, setState] = useState<PlayerCardsState>(initial);

  useEffect(() => {
    if (!slug) return;
    const ctrl = new AbortController();
    setState(initial());
    storage.pruneCards();

    (async () => {
      let index: PlayerIndex;
      try {
        index = await getJson<PlayerIndex>(`/api/players/${encodeURIComponent(slug)}`, ctrl.signal);
      } catch (e) {
        if (!ctrl.signal.aborted) setState((s) => ({ ...s, status: 'error', error: (e as Error).message }));
        return;
      }
      const { player, tournaments } = index;
      setState((s) => ({ ...s, player, total: tournaments.length, status: tournaments.length ? 'loading' : 'ready' }));

      const queue = [...tournaments];
      const worker = async () => {
        for (let t = queue.shift(); t; t = queue.shift()) {
          if (ctrl.signal.aborted) return;
          let card: PassCard | null | undefined = storage.getCard(player.userId, t.id);
          let failed = false;
          if (card === undefined) {
            try {
              const res = await getJson<{ card: PassCard | null; settled: boolean }>(
                `/api/cards/${t.id}?userId=${player.userId}&name=${encodeURIComponent(player.gamerTag)}`,
                ctrl.signal,
              );
              card = res.card;
              if (res.settled) storage.setCard(player.userId, t.id, card);
            } catch {
              if (ctrl.signal.aborted) return;
              failed = true;
              card = null;
            }
          }
          const got = card;
          setState((s) => {
            const done = s.done + 1;
            return {
              ...s,
              cards: got ? [...s.cards, got] : s.cards,
              done,
              failed: s.failed + (failed ? 1 : 0),
              status: done >= s.total ? 'ready' : 'loading',
            };
          });
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    })();

    return () => ctrl.abort();
  }, [slug]);

  return state;
}

function initial(): PlayerCardsState {
  return { status: 'loading', player: null, cards: [], total: 0, done: 0, failed: 0, error: null };
}

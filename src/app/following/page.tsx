'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Attribution } from '@/components/Attribution';
import { formatDate } from '@/lib/client/format';
import { storage, type FollowEntry } from '@/lib/client/storage';
import type { PlayerIndex, TournamentStub } from '@/lib/model/types';

type Item = { follow: FollowEntry; tournament: TournamentStub; isNew: boolean };

const LIMIT = 60;

/** フォロー中のプレイヤーが新しく出場した大会(= 増えたカード)のタイムライン */
export default function FollowingPage() {
  const [follows, setFollows] = useState<FollowEntry[] | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => {
    const list = storage.getFollowing();
    setFollows(list);
    if (list.length === 0) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      const results = await Promise.allSettled(
        list.map(async (f) => {
          const res = await fetch(`/api/players/${f.slug}`, { signal: ctrl.signal });
          if (!res.ok) throw new Error(f.gamerTag);
          return { follow: f, index: (await res.json()) as PlayerIndex };
        }),
      );
      if (ctrl.signal.aborted) return;

      const seen = new Set(storage.getSeen());
      const firstVisit = seen.size === 0;
      const all: Item[] = [];
      const bad: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          bad.push(list[i].gamerTag);
          return;
        }
        const { follow, index } = r.value;
        for (const t of index.tournaments) {
          const key = `${follow.slug}:${t.id}`;
          // フォローした時点より前の大会は NEW にしない
          const isNew = !firstVisit && !seen.has(key) && t.startAt >= follow.followedAt.slice(0, 10);
          all.push({ follow, tournament: t, isNew });
          seen.add(key);
        }
      });
      all.sort((a, b) => b.tournament.startAt.localeCompare(a.tournament.startAt));
      setItems(all.slice(0, LIMIT));
      setFailed(bad);
      storage.setSeen([...seen]);
    })();
    return () => ctrl.abort();
  }, []);

  if (!follows) return null;

  if (follows.length === 0) {
    return (
      <div className="setup">
        <h1>フォロー</h1>
        <p>気になる選手をフォローすると、その人が新しい大会に出るたびにここに流れてきます。</p>
        <Link className="btn" href="/search">
          プレイヤーをさがす
        </Link>
      </div>
    );
  }

  return (
    <div className="timeline">
      <div className="timeline-follows">
        {follows.map((f) => (
          <Link key={f.slug} href={`/p/${f.slug}`} className="chip">
            {f.gamerTag}
          </Link>
        ))}
      </div>
      {!items && <p className="muted">読み込み中…</p>}
      {failed.length > 0 && <p className="b-warn">{failed.join(', ')} の取得に失敗しました</p>}
      <ol className="timeline-list">
        {items?.map(({ follow, tournament, isNew }) => (
          <li key={`${follow.slug}:${tournament.id}`}>
            <Link href={`/p/${follow.slug}`}>
              <time>{formatDate(tournament.startAt)}</time>
              <span>
                <b>{follow.gamerTag}</b> が <b>{tournament.name}</b> に出場
              </span>
              {isNew && <em className="new">NEW</em>}
            </Link>
          </li>
        ))}
      </ol>
      <Attribution className="page-attribution" />
    </div>
  );
}

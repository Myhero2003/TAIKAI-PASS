'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Attribution } from '@/components/Attribution';
import { ProfileForm } from '@/components/ProfileForm';
import { GameShelves, PlayerShelf, type TileItem } from '@/components/Recommendations';
import type { Recommendation } from '@/lib/client/recommendations';
import { storage, toFollowEntry, type FollowEntry } from '@/lib/client/storage';
import { useSession } from '@/lib/client/useSession';

export default function SearchPage() {
  const router = useRouter();
  const { session } = useSession();
  const [follows, setFollows] = useState<FollowEntry[]>([]);
  const [opponents, setOpponents] = useState<Recommendation[]>([]);

  useEffect(() => setFollows(storage.getFollowing()), []);
  useEffect(() => {
    if (session?.user) setOpponents(storage.getRecommendations(session.user.userId) ?? []);
  }, [session]);

  const followed = useMemo(() => new Set(follows.map((f) => f.slug)), [follows]);
  const opponentItems = useMemo<TileItem[]>(
    () =>
      opponents
        .filter((r) => r.slug !== session?.user?.slug)
        .slice(0, 12)
        .map((r) => ({ ...r, highlight: `${r.sets}回対戦` })),
    [opponents, session],
  );

  const follow = (item: TileItem) => {
    if (followed.has(item.slug)) return;
    const next = [...storage.getFollowing(), toFollowEntry(item)];
    storage.setFollowing(next);
    setFollows(next);
  };

  return (
    <div className="sr">
      <h1>さがす</h1>
      <PlayerShelf title="よく対戦した相手" items={opponentItems} followed={followed} onFollow={follow} />
      <GameShelves followed={followed} onFollow={follow} />

      <section className="sr-url">
        <h2>プロフィール URL で見る</h2>
        <p>
          start.gg のプロフィール URL を入れると、その人がこれまで出場した大会をカードで見られます(閲覧のみ)。
          タグ名での検索は start.gg の公開 API が対応していないため、URL で指定します。
        </p>
        <ProfileForm submitLabel="見る" onSubmit={(slug) => router.push(`/p/${slug}`)} />
      </section>
      <Attribution className="page-attribution" />
    </div>
  );
}

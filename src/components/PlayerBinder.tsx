'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { storage, toFollowEntry, type FollowEntry } from '@/lib/client/storage';
import type { PlayerProfile } from '@/lib/model/types';
import { buildRecommendations } from '@/lib/client/recommendations';
import { usePlayerCards } from '@/lib/client/usePlayerCards';
import { Binder } from './Binder';

type Props = {
  slug: string;
  isOwner: boolean;
  /** 自分のバインダーのときのメニュー(ログアウトなど) */
  ownerActions?: ReactNode;
};

/** start.gg から取得したカードでバインダーを表示する。他プレイヤーの閲覧も同じ UI */
export function PlayerBinder({ slug, isOwner, ownerActions }: Props) {
  const state = usePlayerCards(slug);
  const { player, cards, status, setLoadOrder } = state;

  useEffect(() => {
    // 大会に出ていない人も「集計済み(対戦相手なし)」として保存する
    if (!isOwner || !player || (cards.length === 0 && status !== 'ready')) return;
    storage.saveRecommendations(player.userId, buildRecommendations(cards), cards.length, status === 'ready');
  }, [isOwner, player, cards, status]);

  if (state.status === 'error') {
    return (
      <div className="page-message">
        <p>{state.error}</p>
      </div>
    );
  }

  return (
    <Binder
      player={state.player}
      cards={state.cards}
      isOwner={isOwner}
      onSortChange={(sort) => setLoadOrder(sort === 'date_asc' ? 'oldest' : 'newest')}
      progress={{
        done: state.done,
        total: state.total,
        failed: state.failed,
        loading: state.status === 'loading',
      }}
      actions={
        isOwner ? ownerActions : state.player && <FollowButton slug={slug} player={state.player} />
      }
    />
  );
}

function FollowButton({ slug, player }: { slug: string; player: PlayerProfile }) {
  const [following, setFollowing] = useState<FollowEntry[] | null>(null);
  useEffect(() => setFollowing(storage.getFollowing()), []);
  if (!following) return null;

  const isFollowing = following.some((f) => f.slug === slug);
  const toggle = () => {
    const next = isFollowing
      ? following.filter((f) => f.slug !== slug)
      : [...following, toFollowEntry({ ...player, slug })];
    storage.setFollowing(next);
    setFollowing(next);
  };

  return (
    <button className={isFollowing ? 'btn-ghost' : 'btn'} onClick={toggle} aria-pressed={isFollowing}>
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  );
}

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { storage, type FollowEntry } from '@/lib/client/storage';
import { usePlayerCards } from '@/lib/client/usePlayerCards';
import { Binder } from './Binder';

type Props = {
  slug: string;
  isOwner: boolean;
  /** 自分のバインダーのときのメニュー(プロフィール変更など) */
  ownerActions?: ReactNode;
};

/** start.gg から取得したカードでバインダーを表示する。他プレイヤーの閲覧も同じ UI */
export function PlayerBinder({ slug, isOwner, ownerActions }: Props) {
  const state = usePlayerCards(slug);

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
      progress={{
        done: state.done,
        total: state.total,
        failed: state.failed,
        loading: state.status === 'loading',
      }}
      actions={
        isOwner ? ownerActions : state.player && <FollowButton slug={slug} gamerTag={state.player.gamerTag} />
      }
    />
  );
}

function FollowButton({ slug, gamerTag }: { slug: string; gamerTag: string }) {
  const [following, setFollowing] = useState<FollowEntry[] | null>(null);
  useEffect(() => setFollowing(storage.getFollowing()), []);
  if (!following) return null;

  const isFollowing = following.some((f) => f.slug === slug);
  const toggle = () => {
    const next = isFollowing
      ? following.filter((f) => f.slug !== slug)
      : [...following, { slug, gamerTag, followedAt: new Date().toISOString() }];
    storage.setFollowing(next);
    setFollowing(next);
  };

  return (
    <button className={isFollowing ? 'btn-ghost' : 'btn'} onClick={toggle} aria-pressed={isFollowing}>
      {isFollowing ? 'フォロー中' : 'フォロー'}
    </button>
  );
}

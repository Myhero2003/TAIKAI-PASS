'use client';

import { use } from 'react';
import { PlayerBinder } from '@/components/PlayerBinder';
import { useSession } from '@/lib/client/useSession';

/** 他プレイヤーのバインダー(閲覧のみ)。ログイン中の本人のページなら自分のバインダーとして表示 */
export default function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { session } = useSession();
  if (!session) return null;
  const normalized = slug.toLowerCase();
  return <PlayerBinder slug={normalized} isOwner={session.user?.slug === normalized} />;
}

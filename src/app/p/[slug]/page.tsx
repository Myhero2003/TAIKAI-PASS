'use client';

import { use, useEffect, useState } from 'react';
import { PlayerBinder } from '@/components/PlayerBinder';
import { storage } from '@/lib/client/storage';

/** 他プレイヤーのバインダー(閲覧のみ)。自分の slug なら自分のバインダーとして表示 */
export default function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => setMe(storage.getMe()), []);
  if (me === undefined) return null;
  return <PlayerBinder slug={slug.toLowerCase()} isOwner={me === slug.toLowerCase()} />;
}

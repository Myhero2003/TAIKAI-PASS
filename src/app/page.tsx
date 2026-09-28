'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Attribution } from '@/components/Attribution';
import { PlayerBinder } from '@/components/PlayerBinder';
import { ProfileForm } from '@/components/ProfileForm';
import { storage } from '@/lib/client/storage';

export default function Home() {
  // undefined = localStorage 読み込み前
  const [me, setMe] = useState<string | null | undefined>(undefined);
  useEffect(() => setMe(storage.getMe()), []);

  if (me === undefined) return null;

  if (!me) {
    return (
      <div className="setup">
        <h1>
          出場した大会が、
          <br />
          パスになって集まる。
        </h1>
        <p>
          順位に関係なく、出場した大会ごとに1枚。start.gg のプロフィール URL を入れると、これまでの大会がカードになります。
        </p>
        <ProfileForm
          submitLabel="バインダーを作る"
          onSubmit={(slug) => {
            storage.setMe(slug);
            setMe(slug);
          }}
        />
        <div className="setup-links">
          <Link href="/lp">TAIKAI PASS とは →</Link>
          <Link href="/demo">デモを見る →</Link>
        </div>
        <Attribution className="page-attribution" />
      </div>
    );
  }

  return (
    <PlayerBinder
      slug={me}
      isOwner
      ownerActions={
        <button
          className="btn-ghost"
          onClick={() => {
            storage.setMe(null);
            setMe(null);
          }}
        >
          変更
        </button>
      }
    />
  );
}

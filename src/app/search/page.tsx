'use client';

import { useRouter } from 'next/navigation';
import { Attribution } from '@/components/Attribution';
import { ProfileForm } from '@/components/ProfileForm';

export default function SearchPage() {
  const router = useRouter();
  return (
    <div className="setup">
      <h1>ほかのプレイヤーを見る</h1>
      <p>
        start.gg のプロフィール URL を入れると、その人がこれまで出場した大会をカードで見られます(閲覧のみ)。
        タグ名での検索は start.gg の公開 API が対応していないため、URL で指定します。
      </p>
      <ProfileForm submitLabel="見る" onSubmit={(slug) => router.push(`/p/${slug}`)} />
      <Attribution className="page-attribution" />
    </div>
  );
}

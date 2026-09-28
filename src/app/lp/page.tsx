import type { Metadata } from 'next';
import { LP_FEATURED_SLUG } from '@/config';
import { Landing } from '@/components/lp/Landing';
import { getShowcase } from '@/lib/server/showcase';

// ビルド時に実データで静的生成し、1日ごとに裏で作り直す
export const revalidate = 86400;
export const maxDuration = 120;

export const metadata: Metadata = {
  title: 'TAIKAI PASS — 出た大会の数だけ、パスが増える。',
  description:
    '順位に関係なく、出場した大会ごとに1枚。start.gg の大会記録が、首かけパスのコレクションになる。',
};

export default async function LandingPage() {
  return <Landing showcase={await getShowcase(LP_FEATURED_SLUG)} />;
}

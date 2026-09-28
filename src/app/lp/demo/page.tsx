import type { Metadata } from 'next';
import { Landing } from '@/components/lp/Landing';
import { demoShowcase } from '@/lib/server/showcase';

export const metadata: Metadata = {
  title: 'TAIKAI PASS(デモ)',
  robots: { index: false },
};

/** 架空データでの LP。スクリーンショット撮影や、実データなしでの確認用 */
export default function LandingDemoPage() {
  return <Landing showcase={demoShowcase()} />;
}

'use client';

import { Binder } from '@/components/Binder';
import { DEMO_CARDS, DEMO_PLAYER } from '@/lib/mock';

export default function DemoPage() {
  return <Binder player={DEMO_PLAYER} cards={DEMO_CARDS} isOwner={false} actions={<span className="b-demo">DEMO</span>} />;
}

'use client';

import type { CSSProperties } from 'react';
import { CardBack, CardFront, Lanyard } from '@/components/CardFaces';
import type { PassCard } from '@/lib/model/types';

/**
 * 動かない1枚のパス(表 or 裏)。LP の説明用。
 * width は CSS の長さ("min(40vw, 200px)" など)。カード内の寸法はすべて --cw 基準なので追従する
 */
export function StaticPass({ card, side, width }: { card: PassCard; side: 'front' | 'back'; width: string }) {
  return (
    <div className="pc pc-static" style={{ '--cw': width } as CSSProperties}>
      <Lanyard color={card.tournament.theme.primary} />
      <div className="pc-flip">{side === 'front' ? <CardFront card={card} /> : <CardBack card={card} />}</div>
    </div>
  );
}

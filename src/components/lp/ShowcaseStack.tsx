'use client';

import { useState, type CSSProperties } from 'react';
import { CardStack } from '@/components/CardStack';
import { formatDate, placeLabel } from '@/lib/client/format';
import type { PassCard } from '@/lib/model/types';

/** LP のヒーローに置く、実際に触れるカード一覧。拡大中は背景が大会の色に染まる */
export function ShowcaseStack({ cards }: { cards: PassCard[] }) {
  const [center, setCenter] = useState<PassCard | null>(cards[0] ?? null);
  const [focused, setFocused] = useState<PassCard | null>(null);
  const [tint, setTint] = useState<string>('transparent');

  return (
    <div className={`lp-stack${focused ? ' is-focus' : ''}`}>
      <div className="lp-stack-tint" style={{ '--tint': tint } as CSSProperties} data-on={focused ? '1' : '0'} />
      <CardStack
        cards={cards}
        onCenterChange={setCenter}
        onFocusChange={(card) => {
          setFocused(card);
          if (card) setTint(card.tournament.theme.primary);
        }}
      />
      <div className="lp-stack-caption">
        {focused ? (
          <span>左右にドラッグで裏返す · タップで戻る</span>
        ) : center ? (
          <>
            <b>{center.tournament.name}</b>
            <span>
              {formatDate(center.date)} · {placeLabel(center)}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

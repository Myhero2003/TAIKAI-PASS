'use client';

import { useRef, useState } from 'react';
import { formatDate } from '@/lib/client/format';
import type { PassCard } from '@/lib/model/types';

type Props = {
  cards: PassCard[];
  onSave: (tournamentIds: string[]) => void;
  onClose: () => void;
};

/** 手動並び替え。ハンドルを縦にドラッグ(キーボードは ↑↓)で順番を入れ替える */
export function ReorderSheet({ cards, onSave, onClose }: Props) {
  const [items, setItems] = useState(cards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ id: string; startY: number; rowH: number } | null>(null);

  function move(from: number, to: number) {
    setItems((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    const row = e.currentTarget.closest('li');
    if (!row) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, startY: e.clientY, rowH: row.getBoundingClientRect().height };
    setDragId(id);
    setOffset(0);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    const index = items.findIndex((c) => c.id === d.id);
    const steps = Math.trunc(dy / d.rowH);
    const to = Math.max(0, Math.min(items.length - 1, index + steps));
    if (to !== index) {
      move(index, to);
      d.startY += (to - index) * d.rowH;
    }
    setOffset(e.clientY - d.startY);
  }

  function onPointerUp() {
    drag.current = null;
    setDragId(null);
    setOffset(0);
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowUp' && index > 0) move(index, index - 1);
    else if (e.key === 'ArrowDown' && index < items.length - 1) move(index, index + 1);
    else return;
    e.preventDefault();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="カードの並び替え" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="btn-ghost" onClick={onClose}>
            キャンセル
          </button>
          <strong>並び替え</strong>
          <button className="btn" onClick={() => onSave(items.map((c) => c.tournament.id))}>
            保存
          </button>
        </div>
        <ol className="reorder">
          {items.map((card, i) => (
            <li
              key={card.id}
              className={dragId === card.id ? 'is-dragging' : ''}
              style={dragId === card.id ? { transform: `translateY(${offset}px)` } : undefined}
            >
              <span className="reorder-swatch" style={{ background: card.tournament.theme.primary }} />
              <span className="reorder-text">
                <b>{card.tournament.name}</b>
                <small>{formatDate(card.date)}</small>
              </span>
              <button
                className="reorder-handle"
                aria-label={`${card.tournament.name} を移動(↑↓キー)`}
                onPointerDown={(e) => onPointerDown(e, card.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                ≡
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

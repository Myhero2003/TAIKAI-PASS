'use client';

import { useState } from 'react';
import { storage } from '@/lib/client/storage';

/** この端末に保存した TAIKAI PASS のデータ(フォロー・並び順・キャッシュ)を消す */
export function ClearDataButton() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'done'>('idle');

  if (step === 'done') return <p className="muted">この端末のデータを削除しました。</p>;
  if (step === 'confirm') {
    return (
      <div className="clear-confirm">
        <span>フォロー・並び順もすべて消えます。</span>
        <button
          className="btn"
          onClick={() => {
            storage.clearAll();
            setStep('done');
          }}
        >
          削除する
        </button>
        <button className="btn-ghost" onClick={() => setStep('idle')}>
          やめる
        </button>
      </div>
    );
  }
  return (
    <button className="btn-ghost" onClick={() => setStep('confirm')}>
      この端末のデータを削除
    </button>
  );
}

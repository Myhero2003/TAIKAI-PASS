'use client';

import { useState } from 'react';
import { parseUserSlug } from '@/lib/slug';

type Props = {
  submitLabel: string;
  onSubmit: (slug: string) => void;
};

/** start.gg のプロフィール URL(または user slug)を受け取るフォーム */
export function ProfileForm({ submitLabel, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        const slug = parseUserSlug(value);
        if (!slug) {
          setError('start.gg のプロフィール URL を入力してください(例: https://www.start.gg/user/1a2b3c4d)');
          return;
        }
        setError(null);
        onSubmit(slug);
      }}
    >
      <input
        type="text"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://www.start.gg/user/xxxxxxxx"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="start.gg のプロフィール URL"
      />
      <button className="btn" type="submit">
        {submitLabel}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}

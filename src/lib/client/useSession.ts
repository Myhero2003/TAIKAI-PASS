'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SessionState } from '@/lib/model/types';

/** ログイン状態。読み込みが終わるまでは null */
export function useSession() {
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/auth/me', { signal: ctrl.signal, cache: 'no-store' })
      .then((res) => res.json() as Promise<SessionState>)
      .then(setSession)
      .catch(() => {
        if (!ctrl.signal.aborted) setSession({ configured: false, user: null });
      });
    return () => ctrl.abort();
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession((s) => (s ? { ...s, user: null } : s));
  }, []);

  return { session, logout };
}

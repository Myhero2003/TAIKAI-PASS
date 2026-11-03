'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Attribution } from '@/components/Attribution';
import { PlayerBinder } from '@/components/PlayerBinder';
import { useSession } from '@/lib/client/useSession';

const LOGIN_MESSAGE: Record<string, string> = {
  denied: 'start.gg でのログインがキャンセルされました。',
  failed: 'ログインに失敗しました。もう一度お試しください。',
  unavailable: 'ログインは現在ご利用いただけません。',
};

export default function Home() {
  const { session, logout } = useSession();
  const [loginResult, setLoginResult] = useState<string | null>(null);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('login');
    if (!result) return;
    setLoginResult(result);
    window.history.replaceState(null, '', '/'); // 再読み込みでメッセージが残らないように
  }, []);

  if (!session) return null;

  if (session.user) {
    return (
      <PlayerBinder
        slug={session.user.slug}
        isOwner
        ownerActions={
          <button className="btn-ghost" onClick={logout}>
            ログアウト
          </button>
        }
      />
    );
  }

  return (
    <div className="setup">
      <h1>
        出場した大会が、
        <br />
        パスになって集まる。
      </h1>
      <p>順位に関係なく、出場した大会ごとに1枚。start.gg でログインすると、これまでの大会がカードになります。</p>
      {loginResult && LOGIN_MESSAGE[loginResult] && <p className="form-error">{LOGIN_MESSAGE[loginResult]}</p>}
      {session.configured ? (
        <>
          {/* OAuth の遷移先はサイト外なので Link ではなく a を使う */}
          <a className="btn btn-lg setup-login" href="/api/auth/login">
            start.gg でログイン
          </a>
          <p className="setup-note">
            本人確認のためだけに使います。受け取るのは公開プロフィールのみで、メールアドレスやパスワードは受け取りません。
          </p>
        </>
      ) : (
        <p className="setup-note">ログインは準備中です。ほかのプレイヤーのバインダーは「さがす」から見られます。</p>
      )}
      <div className="setup-links">
        <Link href="/lp">TAIKAI PASS とは →</Link>
        <Link href="/demo">デモを見る →</Link>
      </div>
      <Attribution className="page-attribution" />
    </div>
  );
}

import 'server-only';
import type { SessionUser } from '@/lib/model/types';
import { parseUserSlug } from '@/lib/slug';
import { gql, StartggError } from '@/lib/startgg/client';
import { CURRENT_USER } from '@/lib/startgg/queries';
import type { RawCurrentUser } from '@/lib/startgg/raw';

// start.gg OAuth: https://developer.start.gg/docs/oauth/oauth-overview/
const AUTHORIZE_URL = 'https://start.gg/oauth/authorize';
const TOKEN_URL = 'https://api.start.gg/oauth/access_token';
/** 本人確認に必要な最小限のスコープ(メールアドレス等は要求しない) */
const SCOPE = 'user.identity';

export const SESSION_COOKIE = 'tp_session';
export const STATE_COOKIE = 'tp_oauth_state';

type AuthConfig = { clientId: string; clientSecret: string; sessionSecret: string };

/** 環境変数が揃っていなければ null(ログイン機能を無効にして動かす) */
export function getAuthConfig(): AuthConfig | null {
  const clientId = process.env.STARTGG_OAUTH_CLIENT_ID;
  const clientSecret = process.env.STARTGG_OAUTH_CLIENT_SECRET;
  const sessionSecret = process.env.SESSION_SECRET;
  return clientId && clientSecret && sessionSecret ? { clientId, clientSecret, sessionSecret } : null;
}

export function authorizeUrl(config: AuthConfig, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    scope: SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

/**
 * 認可コードから本人の start.gg アカウントを確定する。
 * アクセストークンは本人確認にだけ使い、保存しない。
 */
export async function identifyUser(config: AuthConfig, code: string, redirectUri: string): Promise<SessionUser> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      scope: SCOPE,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new StartggError(`start.gg のトークン交換に失敗しました (HTTP ${res.status})`, 502);

  const { access_token: accessToken } = (await res.json()) as { access_token?: string };
  if (!accessToken) throw new StartggError('start.gg からアクセストークンが返りませんでした', 502);

  const { currentUser } = await gql<RawCurrentUser>(CURRENT_USER, {}, { token: accessToken });
  const slug = parseUserSlug(currentUser?.slug ?? '');
  if (!currentUser || !slug) throw new StartggError('start.gg のユーザー情報を取得できませんでした', 502);

  return { userId: String(currentUser.id), slug, gamerTag: currentUser.player?.gamerTag ?? slug };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // OAuth の戻りは別サイトからの遷移なので strict にはできない
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

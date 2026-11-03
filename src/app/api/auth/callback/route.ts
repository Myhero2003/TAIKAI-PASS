import { NextResponse, type NextRequest } from 'next/server';
import {
  getAuthConfig,
  identifyUser,
  SESSION_COOKIE,
  sessionCookieOptions,
  STATE_COOKIE,
} from '@/lib/server/auth';
import { SESSION_TTL_SEC, signSession } from '@/lib/server/session-token';

/** start.gg のログイン画面からの戻り先 */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl;
  const finish = (login: string, session?: string) => {
    const res = NextResponse.redirect(new URL(login ? `/?login=${login}` : '/', origin));
    res.cookies.delete(STATE_COOKIE);
    if (session) res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(SESSION_TTL_SEC));
    return res;
  };

  const config = getAuthConfig();
  if (!config) return finish('unavailable');
  if (searchParams.get('error')) return finish('denied');

  // 他人のアカウントでログインさせられる攻撃を防ぐため、送った state と一致しなければ受け付けない
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  if (!code || !state || state !== req.cookies.get(STATE_COOKIE)?.value) return finish('failed');

  try {
    const user = await identifyUser(config, code, `${origin}/api/auth/callback`);
    return finish('', signSession(user, config.sessionSecret));
  } catch (e) {
    console.error('[auth] start.gg ログインに失敗しました', e);
    return finish('failed');
  }
}

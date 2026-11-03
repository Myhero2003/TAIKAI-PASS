import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { authorizeUrl, getAuthConfig, sessionCookieOptions, STATE_COOKIE } from '@/lib/server/auth';

/** start.gg のログイン画面へ送る */
export async function GET(req: NextRequest) {
  const config = getAuthConfig();
  if (!config) return NextResponse.redirect(new URL('/?login=unavailable', req.nextUrl.origin));

  const state = randomBytes(24).toString('base64url');
  const redirectUri = `${req.nextUrl.origin}/api/auth/callback`;
  const res = NextResponse.redirect(authorizeUrl(config, redirectUri, state));
  res.cookies.set(STATE_COOKIE, state, sessionCookieOptions(600));
  return res;
}

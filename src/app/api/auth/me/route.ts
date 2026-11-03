import { NextResponse, type NextRequest } from 'next/server';
import type { SessionState } from '@/lib/model/types';
import { getAuthConfig, SESSION_COOKIE } from '@/lib/server/auth';
import { verifySession } from '@/lib/server/session-token';

/** 今のログイン状態。人によって答えが違うので CDN にキャッシュさせない */
export async function GET(req: NextRequest) {
  const config = getAuthConfig();
  const body: SessionState = {
    configured: !!config,
    user: config ? verifySession(req.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret) : null,
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
}

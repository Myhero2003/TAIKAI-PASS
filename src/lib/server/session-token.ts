import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionUser } from '@/lib/model/types';

/** ログイン状態を保つ期間 */
export const SESSION_TTL_SEC = 30 * 24 * 3600;

function sign(body: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(body).digest();
}

/** ログインユーザーを署名付きトークンにする。サーバー側に保存しないので、改ざんは署名で検知する */
export function signSession(user: SessionUser, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: now + SESSION_TTL_SEC * 1000 })).toString('base64url');
  return `${body}.${sign(body, secret).toString('base64url')}`;
}

/** 署名が正しく期限内なら中身を返す。それ以外は null */
export function verifySession(token: string | undefined, secret: string, now = Date.now()): SessionUser | null {
  if (!token) return null;
  const [body, signature, ...rest] = token.split('.');
  if (!body || !signature || rest.length > 0) return null;

  const expected = sign(body, secret);
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const { userId, slug, gamerTag, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof exp !== 'number' || exp <= now) return null;
    return { userId, slug, gamerTag };
  } catch {
    return null;
  }
}

import { describe, expect, it } from 'vitest';
import { SESSION_TTL_SEC, signSession, verifySession } from './session-token';

const user = { userId: '42', slug: '1a2b3c4d', gamerTag: 'MYHERO' };
const SECRET = 'test-secret';
const NOW = 1_800_000_000_000;

describe('session token', () => {
  it('署名したユーザーを取り出せる', () => {
    expect(verifySession(signSession(user, SECRET, NOW), SECRET, NOW)).toEqual(user);
  });

  it('中身を書き換えると無効になる(他人になりすませない)', () => {
    const [, signature] = signSession(user, SECRET, NOW).split('.');
    const forged = Buffer.from(
      JSON.stringify({ userId: '1', slug: 'victim', gamerTag: 'X', exp: NOW + 1000 }),
    ).toString('base64url');
    expect(verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it('別の鍵で署名したものは無効', () => {
    expect(verifySession(signSession(user, 'other', NOW), SECRET, NOW)).toBeNull();
  });

  it('期限が切れたら無効', () => {
    const token = signSession(user, SECRET, NOW);
    expect(verifySession(token, SECRET, NOW + SESSION_TTL_SEC * 1000 + 1)).toBeNull();
  });

  it('壊れた値は無効', () => {
    for (const bad of [undefined, '', 'abc', 'a.b.c', '.']) {
      expect(verifySession(bad, SECRET, NOW)).toBeNull();
    }
  });
});

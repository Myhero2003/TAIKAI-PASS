import { describe, expect, it } from 'vitest';
import type { TournamentStub } from '@/lib/model/types';
import { buildTimeline, seenKey, sortByLatest } from './following';
import type { FollowEntry } from './storage';

const follow = (slug: string, followedAt = '2026-01-01T00:00:00.000Z'): FollowEntry => ({
  slug,
  gamerTag: slug.toUpperCase(),
  followedAt,
});

const t = (id: string, startAt: string): TournamentStub => ({
  id,
  slug: `tournament/${id}`,
  name: id,
  startAt,
  endAt: startAt,
  iconUrl: null,
});

describe('buildTimeline', () => {
  it('同じ大会に出た人を1行にまとめ、新しい順に並べる', () => {
    const rows = buildTimeline(
      [
        { follow: follow('a'), tournaments: [t('2', '2026-03-01T00:00:00.000Z'), t('1', '2026-02-01T00:00:00.000Z')] },
        { follow: follow('b'), tournaments: [t('2', '2026-03-01T00:00:00.000Z')] },
        { follow: follow('c'), tournaments: null },
      ],
      new Set(),
    );
    expect(rows.map((r) => r.tournament.id)).toEqual(['2', '1']);
    expect(rows[0].players.map((p) => p.follow.slug)).toEqual(['a', 'b']);
  });

  it('初めて開いたときは何も NEW にしない', () => {
    const rows = buildTimeline(
      [{ follow: follow('a'), tournaments: [t('1', '2026-02-01T00:00:00.000Z')] }],
      new Set(),
    );
    expect(rows[0].isNew).toBe(false);
  });

  it('未見かつフォロー後の大会だけ NEW にする', () => {
    const seen = new Set([seenKey('a', 'seen')]);
    const rows = buildTimeline(
      [
        {
          follow: follow('a', '2026-02-01T00:00:00.000Z'),
          tournaments: [
            t('fresh', '2026-03-01T00:00:00.000Z'),
            t('seen', '2026-03-01T00:00:00.000Z'),
            t('before-follow', '2026-01-15T00:00:00.000Z'),
          ],
        },
      ],
      seen,
    );
    const isNew = Object.fromEntries(rows.map((r) => [r.tournament.id, r.isNew]));
    expect(isNew).toEqual({ fresh: true, seen: false, 'before-follow': false });
  });
});

describe('sortByLatest', () => {
  it('最新の大会が新しい人を先頭に、読み込み中は後ろに', () => {
    const sorted = sortByLatest([
      { follow: follow('loading'), tournaments: null },
      { follow: follow('old'), tournaments: [t('1', '2025-01-01T00:00:00.000Z')] },
      { follow: follow('new'), tournaments: [t('2', '2026-01-01T00:00:00.000Z')] },
    ]);
    expect(sorted.map((p) => p.follow.slug)).toEqual(['new', 'old', 'loading']);
  });
});

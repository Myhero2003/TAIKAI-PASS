import { describe, expect, it } from 'vitest';
import type { Opponent, PassCard } from '@/lib/model/types';
import { buildRecommendations } from './recommendations';

const opp = (slug: string, sets: number, gamerTag = slug): Opponent => ({
  slug,
  gamerTag,
  prefix: null,
  avatarUrl: null,
  sets,
});

const card = (date: string, opponents: Opponent[] | undefined) => ({ date, opponents }) as PassCard;

describe('buildRecommendations', () => {
  it('大会をまたいで対戦数を合計し、多い順に並べる', () => {
    const recs = buildRecommendations([
      card('2026-01-01', [opp('a', 1), opp('b', 1)]),
      card('2026-02-01', [opp('a', 2)]),
    ]);
    expect(recs.map((r) => [r.slug, r.sets])).toEqual([
      ['a', 3],
      ['b', 1],
    ]);
  });

  it('同じ対戦数なら最近対戦した人を先にする', () => {
    const recs = buildRecommendations([
      card('2026-01-01', [opp('old', 1)]),
      card('2026-03-01', [opp('recent', 1)]),
    ]);
    expect(recs.map((r) => r.slug)).toEqual(['recent', 'old']);
  });

  it('改名していたら最新の大会の名前を使う(カードの順番によらない)', () => {
    const recs = buildRecommendations([
      card('2026-03-01', [opp('a', 1, 'NEW')]),
      card('2026-01-01', [opp('a', 1, 'OLD')]),
    ]);
    expect(recs[0].gamerTag).toBe('NEW');
    expect(recs[0].lastPlayedAt).toBe('2026-03-01');
  });

  it('opponents がない古い形式のカードがあっても落ちない', () => {
    expect(buildRecommendations([card('2026-01-01', undefined)])).toEqual([]);
  });
});

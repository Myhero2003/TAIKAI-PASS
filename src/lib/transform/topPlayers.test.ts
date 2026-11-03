import { describe, expect, it } from 'vitest';
import type { RawTopEvent } from '@/lib/startgg/raw';
import { pickTopPlayers, type TopTournamentInput } from './topPlayers';

const standing = (placement: number, slug: string | null, tag = slug ?? 'x') => ({
  placement,
  entrant: {
    participants: [
      { gamerTag: tag, prefix: null, user: slug ? { slug: `user/${slug}`, images: [{ url: `${slug}.png`, type: 'profile' }] } : null },
    ],
  },
});

const event = (over: Partial<RawTopEvent> = {}): RawTopEvent => ({
  name: 'Singles',
  numEntrants: 100,
  state: 'COMPLETED',
  teamRosterSize: null,
  standings: { nodes: [] },
  ...over,
});

const tournament = (name: string, events: RawTopEvent[]): TopTournamentInput => ({
  name,
  slug: `tournament/${name}`,
  startAt: '2026-10-01T00:00:00.000Z',
  events,
});

describe('pickTopPlayers', () => {
  it('順位順に並べ、大会名と順位を付ける', () => {
    const players = pickTopPlayers([
      tournament('CUP', [event({ standings: { nodes: [standing(2, 'bbbb'), standing(1, 'aaaa')] } })]),
    ]);
    expect(players.map((p) => [p.slug, p.placement, p.tournamentName])).toEqual([
      ['aaaa', 1, 'CUP'],
      ['bbbb', 2, 'CUP'],
    ]);
    expect(players[0].avatarUrl).toBe('aaaa.png');
  });

  it('複数の大会に入賞した人は一番良い順位だけ残す', () => {
    const players = pickTopPlayers([
      tournament('A', [event({ standings: { nodes: [standing(3, 'aaaa')] } })]),
      tournament('B', [event({ standings: { nodes: [standing(1, 'aaaa')] } })]),
    ]);
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({ placement: 1, tournamentName: 'B' });
  });

  it('同じ順位なら参加人数の多い大会を先にする', () => {
    const players = pickTopPlayers([
      tournament('SMALL', [event({ numEntrants: 50, standings: { nodes: [standing(1, 'small') ] } })]),
      tournament('BIG', [event({ numEntrants: 500, standings: { nodes: [standing(1, 'big')] } })]),
    ]);
    expect(players.map((p) => p.slug)).toEqual(['big', 'small']);
  });

  it('ダブルス・Squad Strike・未確定のイベントは対象にしない', () => {
    const nodes = [standing(1, 'aaaa')];
    const players = pickTopPlayers([
      tournament('X', [
        event({ name: 'Doubles', teamRosterSize: { maxPlayers: 2 }, standings: { nodes } }),
        event({ name: 'Squad Strike', standings: { nodes } }),
        event({ name: 'Singles', state: 'ACTIVE', standings: { nodes } }),
      ]),
    ]);
    expect(players).toEqual([]);
  });

  it('本戦と Amateur があれば本戦だけを使う', () => {
    const players = pickTopPlayers([
      tournament('X', [
        event({ name: 'Amateur Bracket', numEntrants: 300, standings: { nodes: [standing(1, 'amateur')] } }),
        event({ name: 'Singles', numEntrants: 200, standings: { nodes: [standing(1, 'main')] } }),
      ]),
    ]);
    expect(players.map((p) => p.slug)).toEqual(['main']);
  });

  it('アカウントのない人は除く', () => {
    const players = pickTopPlayers([
      tournament('X', [event({ standings: { nodes: [standing(1, null), standing(2, 'aaaa')] } })]),
    ]);
    expect(players.map((p) => p.slug)).toEqual(['aaaa']);
  });

  it('多すぎる場合は12人まで', () => {
    const nodes = Array.from({ length: 20 }, (_, i) => standing(i + 1, `user${i}`));
    expect(pickTopPlayers([tournament('X', [event({ standings: { nodes } })])])).toHaveLength(12);
  });
});

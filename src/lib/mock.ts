// デモ用のダミーデータ(大会名・プレイヤーは架空)。start.gg トークンなしで UI を確認するためのもの。

import type { EventFormat, GameRef, JpRegion, PassCard, PlayerProfile } from '@/lib/model/types';
import { makeTheme } from '@/lib/transform/theme';

const SSBU: GameRef = { id: '1386', name: 'スマブラSP', iconUrl: null };
const SF6: GameRef = { id: '43868', name: 'SF6', iconUrl: null };
const T8: GameRef = { id: '49783', name: 'TEKKEN 8', iconUrl: null };
const GGST: GameRef = { id: '33945', name: 'GGST', iconUrl: null };
const GBVSR: GameRef = { id: '48548', name: 'GBVSR', iconUrl: null };

type R = {
  game: GameRef;
  placement: number;
  entrants: number;
  won: number;
  lost: number;
  chars?: Array<[string, number]>;
  format?: EventFormat;
  subs?: Array<[string, number, EventFormat]>;
};

function mk(o: {
  id: string;
  name: string;
  date: string;
  color: string;
  country: string | null;
  region?: JpRegion;
  prefecture?: string;
  city?: string;
  results: R[];
}): PassCard {
  const theme = makeTheme(o.color, 'manual');
  const isOnline = o.country === null;
  const results = o.results.map((r, i) => {
    const played = r.won + r.lost;
    const total = r.chars?.reduce((n, [, g]) => n + g, 0) ?? 0;
    return {
      eventId: `${o.id}-${i}`,
      eventName: `${r.game.name} ${r.format === 'doubles' ? 'Doubles' : 'Singles'}`,
      entrantId: `${o.id}-e${i}`,
      game: r.game,
      format: r.format ?? ('singles' as EventFormat),
      final: true,
      placement: r.placement,
      numEntrants: r.entrants,
      sets: { played, won: r.won, lost: r.lost, dq: 0 },
      winRate: played ? r.won / played : null,
      characters: r.chars
        ? r.chars.map(([name, games], j) => ({ id: `${j}`, name, games, ratio: games / total }))
        : null,
      subEvents: (r.subs ?? []).map(([name, placement, format], j) => ({
        eventId: `${o.id}-${i}-s${j}`,
        name,
        format,
        placement,
        numEntrants: 32,
      })),
    };
  });
  const pcts = results.map((r) => r.placement / r.numEntrants);
  return {
    id: `demo:${o.id}`,
    userId: 'demo',
    tournament: {
      id: o.id,
      slug: `tournament/${o.id}`,
      name: o.name,
      url: 'https://www.start.gg',
      startAt: o.date,
      endAt: o.date,
      isOnline,
      location: {
        country: o.country,
        region: o.region ?? null,
        prefecture: o.prefecture ?? null,
        city: o.city ?? null,
      },
      iconUrl: null,
      theme,
    },
    displayName: 'MYHERO',
    date: o.date,
    country: o.country,
    region: o.region ?? null,
    isOnline,
    filterGameIds: [...new Set(results.map((r) => r.game.id))],
    bestPlacement: Math.min(...results.map((r) => r.placement)),
    bestPercentile: Math.min(...pcts),
    themeHue: theme.hue,
    isMultiTitle: results.length >= 2,
    results,
    opponents: [],
  };
}

export const DEMO_PLAYER: PlayerProfile = {
  userId: 'demo',
  slug: 'demo',
  gamerTag: 'MYHERO',
  prefix: null,
  avatarUrl: null,
  homeCountry: 'JP',
  homeRegion: 'kinki',
};

export const DEMO_CARDS: PassCard[] = [
  mk({
    id: 'hanabi-8',
    name: 'HANABI CUP 8',
    date: '2026-09-13T01:00:00Z',
    color: '#e8452c',
    country: 'JP',
    region: 'kinki',
    prefecture: '大阪府',
    results: [{ game: SSBU, placement: 17, entrants: 256, won: 4, lost: 2, chars: [['ルキナ', 11], ['ソラ', 3]] }],
  }),
  mk({
    id: 'taikai-japan-2026',
    name: 'TAIKAI JAPAN 2026',
    date: '2026-05-02T00:00:00Z',
    color: '#1f3fb8',
    country: 'JP',
    region: 'kanto',
    prefecture: '東京都',
    results: [
      { game: SF6, placement: 257, entrants: 4096, won: 5, lost: 2, chars: [['ケン', 14], ['ジュリ', 2]] },
      { game: T8, placement: 97, entrants: 1536, won: 4, lost: 2, chars: [['風間仁', 12]] },
      { game: GGST, placement: 385, entrants: 1024, won: 2, lost: 2 },
      { game: GBVSR, placement: 129, entrants: 512, won: 3, lost: 2, chars: [['ジータ', 9]] },
    ],
  }),
  mk({
    id: 'kitsune-21',
    name: 'Kitsune Battle 21',
    date: '2026-08-02T03:00:00Z',
    color: '#f2a516',
    country: 'JP',
    region: 'kinki',
    prefecture: '京都府',
    results: [
      {
        game: SSBU,
        placement: 5,
        entrants: 96,
        won: 6,
        lost: 2,
        chars: [['ルキナ', 18], ['ソラ', 4], ['カズヤ', 1]],
        subs: [['Squad Strike', 3, 'squad_strike']],
      },
    ],
  }),
  mk({
    id: 'northern-lights',
    name: 'Northern Lights',
    date: '2026-07-12T02:00:00Z',
    color: '#27a3a0',
    country: 'JP',
    region: 'hokkaido',
    prefecture: '北海道',
    results: [{ game: SSBU, placement: 9, entrants: 128, won: 4, lost: 2 }],
  }),
  mk({
    id: 'online-weekly-104',
    name: 'Online Weekly #104',
    date: '2026-06-24T11:00:00Z',
    color: '#6b4fd8',
    country: null,
    results: [{ game: SSBU, placement: 33, entrants: 180, won: 3, lost: 2, chars: [['ルキナ', 9]] }],
  }),
  mk({
    id: 'harbor-clash',
    name: 'Harbor Clash 2026',
    date: '2026-03-21T17:00:00Z',
    color: '#0f5f8f',
    country: 'US',
    city: 'Seattle',
    results: [{ game: SSBU, placement: 49, entrants: 700, won: 5, lost: 2, chars: [['ルキナ', 16], ['ソラ', 2]] }],
  }),
  mk({
    id: 'seoul-showdown',
    name: 'Seoul Showdown',
    date: '2026-02-14T03:00:00Z',
    color: '#d61f69',
    country: 'KR',
    city: 'Seoul',
    results: [
      { game: T8, placement: 65, entrants: 400, won: 3, lost: 2, chars: [['風間仁', 8]] },
      { game: SF6, placement: 129, entrants: 600, won: 2, lost: 2 },
    ],
  }),
  mk({
    id: 'shikoku-arena',
    name: 'Shikoku Arena 3',
    date: '2026-01-18T02:00:00Z',
    color: '#3a9b3a',
    country: 'JP',
    region: 'shikoku',
    prefecture: '香川県',
    results: [{ game: SSBU, placement: 3, entrants: 64, won: 7, lost: 2, chars: [['ルキナ', 22]] }],
  }),
  mk({
    id: 'kyushu-spirits',
    name: '九州スピリッツ 12',
    date: '2025-11-09T01:00:00Z',
    color: '#c7302a',
    country: 'JP',
    region: 'kyushu_okinawa',
    prefecture: '福岡県',
    results: [{ game: SSBU, placement: 13, entrants: 150, won: 4, lost: 2 }],
  }),
  mk({
    id: 'tohoku-rumble',
    name: 'Tohoku Rumble',
    date: '2025-10-04T02:00:00Z',
    color: '#8a5a2b',
    country: 'JP',
    region: 'tohoku',
    prefecture: '宮城県',
    results: [{ game: SSBU, placement: 25, entrants: 110, won: 3, lost: 2, chars: [['ルキナ', 7], ['マルス', 3]] }],
  }),
];

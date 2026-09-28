import { describe, expect, it } from 'vitest';
import type { RawSet, RawTournament } from '@/lib/startgg/raw';
import { buildCard } from './card';
import { classifyFormat, pickPrimary } from './format';
import { findPrefecture, nearestPrefecture, resolveJpLocation } from './region';
import { summarizeSets } from './sets';
import { computeStats } from './stats';
import { contrastRatio, dominantColor, makeTheme } from './theme';
import { parseUserSlug } from '@/lib/slug';

describe('classifyFormat', () => {
  it('teamRosterSize が null ならシングルス扱い', () => {
    expect(classifyFormat('スマブラSP 本戦', null)).toBe('singles');
    expect(classifyFormat('1on1', 1)).toBe('singles');
  });
  it('ロスター人数でダブルス/チームを分ける', () => {
    expect(classifyFormat('Doubles', 2)).toBe('doubles');
    expect(classifyFormat('Crew', 5)).toBe('team');
  });
  it('ロスター1でも Squad Strike は除外リストで弾く', () => {
    expect(classifyFormat('Ultimate Squad Strike', 1)).toBe('squad_strike');
    expect(classifyFormat('SSBU SQS', null)).toBe('squad_strike');
    expect(classifyFormat('SQUAD STRIKE', null)).toBe('squad_strike');
  });
});

describe('pickPrimary', () => {
  it('シングルス > 副イベントでない > 参加者数 の順で代表を選ぶ', () => {
    const { primary, rest } = pickPrimary([
      { name: 'Amateur Bracket', format: 'singles' as const, numEntrants: 300 },
      { name: 'Squad Strike', format: 'squad_strike' as const, numEntrants: 50 },
      { name: 'Ultimate Singles', format: 'singles' as const, numEntrants: 1000 },
    ]);
    expect(primary.name).toBe('Ultimate Singles');
    expect(rest.map((r) => r.name)).toEqual(['Amateur Bracket', 'Squad Strike']);
  });
});

describe('region', () => {
  it.each([
    ['Tokyo', '東京都'],
    ['東京都', '東京都'],
    ['Tokyo-to', '東京都'],
    ['Tōkyō', '東京都'],
    ['Kyoto', '京都府'],
    ['京都府', '京都府'],
    ['Osaka Prefecture', '大阪府'],
    ['Hyōgo', '兵庫県'],
    ['Hyougo', '兵庫県'],
    ['Fukuoka-ken', '福岡県'],
    ['北海道', '北海道'],
  ])('%s → %s', (input, expected) => {
    expect(findPrefecture(input)?.full).toBe(expected);
  });

  it('知らない表記は null', () => {
    expect(findPrefecture('Somewhere')).toBeNull();
    expect(findPrefecture('')).toBeNull();
  });

  it('addrState がなければ緯度経度から推定', () => {
    expect(nearestPrefecture(34.7, 135.5).full).toBe('大阪府');
    expect(resolveJpLocation({ addrState: null, lat: 33.59, lng: 130.4 })).toEqual({
      region: 'kyushu_okinawa',
      prefecture: '福岡県',
    });
  });
});

function set(winnerId: number, opts: Partial<RawSet> = {}): RawSet {
  return { id: Math.random(), winnerId, displayScore: '2 - 1', slots: [], games: [], ...opts };
}

describe('summarizeSets', () => {
  it('勝率から DQ と未決着を除く', () => {
    const summary = summarizeSets(
      [
        set(10),
        set(10),
        set(99),
        set(10, { displayScore: 'DQ' }),
        set(99, { slots: [{ entrant: { id: 10 }, standing: { stats: { score: { value: -1 } } } }] }),
        { ...set(0), winnerId: null },
        null,
      ],
      '10',
    );
    expect(summary.sets).toEqual({ played: 3, won: 2, lost: 1, dq: 2 });
    expect(summary.winRate).toBeCloseTo(2 / 3);
  });

  it('自分の selection だけでキャラ比率を出す', () => {
    const summary = summarizeSets(
      [
        set(10, {
          games: [
            {
              winnerId: 10,
              selections: [
                { entrant: { id: 10 }, character: { id: 1, name: 'Mario' } },
                { entrant: { id: 99 }, character: { id: 2, name: 'Link' } },
              ],
            },
            { winnerId: 10, selections: [{ entrant: { id: 10 }, character: { id: 1, name: 'Mario' } }] },
            { winnerId: 99, selections: [{ entrant: { id: 10 }, character: { id: 3, name: 'Fox' } }] },
          ],
        }),
      ],
      '10',
    );
    expect(summary.characters).toEqual([
      { id: '1', name: 'Mario', games: 2, ratio: 2 / 3 },
      { id: '3', name: 'Fox', games: 1, ratio: 1 / 3 },
    ]);
  });

  it('キャラ報告がなければ null(0% と区別)', () => {
    expect(summarizeSets([set(10)], '10').characters).toBeNull();
  });
});

describe('theme', () => {
  it('primary に対して読める文字色を選ぶ', () => {
    for (const base of ['#ffe600', '#0a1a6b', '#d6263b', '#f5f5f5', '#101010']) {
      const t = makeTheme(base, 'logo');
      expect(contrastRatio(t.primary, t.onPrimary)).toBeGreaterThanOrEqual(3);
    }
  });

  it('白背景のロゴから主色を拾う', () => {
    const px: number[] = [];
    for (let i = 0; i < 100; i++) px.push(255, 255, 255); // 白
    for (let i = 0; i < 40; i++) px.push(220, 30, 40); // 赤
    for (let i = 0; i < 10; i++) px.push(20, 20, 20); // 黒文字
    const hex = dominantColor(Uint8Array.from(px))!;
    expect(hex).toBe('#dc1e28');
  });

  it('モノクロのロゴは null', () => {
    expect(dominantColor(Uint8Array.from([255, 255, 255, 0, 0, 0, 128, 128, 128]))).toBeNull();
  });
});

const tournament: RawTournament = {
  id: 555,
  slug: 'tournament/evo-japan-2026',
  name: 'EVO Japan 2026',
  startAt: 1777000000,
  endAt: 1777200000,
  isOnline: false,
  countryCode: 'JP',
  addrState: 'Tokyo',
  city: 'Ariake',
  lat: null,
  lng: null,
  images: [{ url: 'https://img/logo.png', type: 'profile' }],
  events: [
    {
      id: 1,
      name: 'Street Fighter 6',
      slug: null,
      startAt: null,
      state: 'COMPLETED',
      numEntrants: 4000,
      teamRosterSize: null,
      videogame: { id: 43868, name: 'Street Fighter 6', displayName: 'SF6', images: [] },
      userEntrant: { id: 1001, name: 'MYHERO', standing: { placement: 257 } },
    },
    {
      id: 2,
      name: 'Tekken 8',
      slug: null,
      startAt: null,
      state: 'COMPLETED',
      numEntrants: 1500,
      teamRosterSize: null,
      videogame: { id: 49783, name: 'Tekken 8', displayName: null, images: [] },
      userEntrant: { id: 1002, name: 'MYHERO', standing: { placement: 33 } },
    },
    {
      id: 3,
      name: 'SF6 Squad Strike',
      slug: null,
      startAt: null,
      state: 'COMPLETED',
      numEntrants: 64,
      teamRosterSize: null,
      videogame: { id: 43868, name: 'Street Fighter 6', displayName: 'SF6', images: [] },
      userEntrant: { id: 1003, name: 'MYHERO', standing: { placement: 9 } },
    },
    {
      id: 4,
      name: 'Guilty Gear',
      slug: null,
      startAt: null,
      state: 'COMPLETED',
      numEntrants: 800,
      teamRosterSize: null,
      videogame: { id: 33945, name: 'GGST', displayName: null, images: [] },
      userEntrant: null,
    },
  ],
};

describe('buildCard', () => {
  const card = buildCard({
    userId: '42',
    fallbackName: 'fallback',
    tournament,
    setsByEntrant: new Map([['1001', [set(1001), set(9)]]]),
    theme: makeTheme('#d6263b', 'logo'),
    useLogo: true,
  })!;

  it('複数タイトル大会は1枚のカードにタイトル別タブ', () => {
    expect(card.id).toBe('42:555');
    expect(card.isMultiTitle).toBe(true);
    expect(card.results.map((r) => r.game.name)).toEqual(['SF6', 'Tekken 8']);
  });

  it('Squad Strike は同タイトルの副イベントに入る', () => {
    expect(card.results[0].subEvents.map((s) => s.name)).toEqual(['SF6 Squad Strike']);
    expect(card.filterGameIds.sort()).toEqual(['43868', '49783']);
  });

  it('順位・地域・勝率', () => {
    expect(card.bestPlacement).toBe(33);
    expect(card.bestPercentile).toBeCloseTo(33 / 1500);
    expect(card.region).toBe('kanto');
    expect(card.results[0].winRate).toBe(0.5);
    expect(card.tournament.iconUrl).toBe('https://img/logo.png');
  });

  it('ロゴ不可ならゲームアイコンにフォールバック', () => {
    const noLogo = buildCard({
      userId: '42',
      fallbackName: 'x',
      tournament,
      setsByEntrant: new Map(),
      theme: makeTheme('#d6263b', 'logo'),
      useLogo: false,
    })!;
    expect(noLogo.tournament.iconUrl).toBeNull();
  });

  it('出場イベントがなければ null', () => {
    expect(
      buildCard({
        userId: '42',
        fallbackName: 'x',
        tournament: { ...tournament, events: [tournament.events![3]] },
        setsByEntrant: new Map(),
        theme: makeTheme('#000', 'fallback'),
        useLogo: true,
      }),
    ).toBeNull();
  });

  it('遠征と皆勤の集計', () => {
    const stats = computeStats([card], { homeCountry: 'JP', homeRegion: 'kinki' }, [
      { id: 'evoj', name: 'EVO Japan', tournamentSlugs: ['tournament/evo-japan-2025', 'tournament/evo-japan-2026'] },
    ]);
    expect(stats.awayCount).toBe(1);
    expect(stats.totalEvents).toBe(3);
    expect(stats.series[0]).toMatchObject({ attended: 1, total: 2, currentStreak: 1, perfect: false });
  });
});

describe('parseUserSlug', () => {
  it.each([
    ['https://www.start.gg/user/1a2b3c4d', '1a2b3c4d'],
    ['start.gg/user/1A2B3C4D/details', '1a2b3c4d'],
    ['user/1a2b3c4d', '1a2b3c4d'],
    ['1a2b3c4d', '1a2b3c4d'],
  ])('%s', (input, expected) => {
    expect(parseUserSlug(input)).toBe(expected);
  });
  it('不正な入力は null', () => {
    expect(parseUserSlug('https://example.com')).toBeNull();
  });
});

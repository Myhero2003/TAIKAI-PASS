import type { JpRegion } from '@/lib/model/types';

type Prefecture = {
  name: string; // 都道府県名(接尾辞なし)
  full: string; // 正式名
  romaji: string;
  region: JpRegion;
  lat: number; // 県庁所在地
  lng: number;
};

// 総務省の8地方区分
const PREFECTURES: Prefecture[] = [
  { name: '北海道', full: '北海道', romaji: 'hokkaido', region: 'hokkaido', lat: 43.064, lng: 141.347 },
  { name: '青森', full: '青森県', romaji: 'aomori', region: 'tohoku', lat: 40.824, lng: 140.74 },
  { name: '岩手', full: '岩手県', romaji: 'iwate', region: 'tohoku', lat: 39.704, lng: 141.153 },
  { name: '宮城', full: '宮城県', romaji: 'miyagi', region: 'tohoku', lat: 38.269, lng: 140.872 },
  { name: '秋田', full: '秋田県', romaji: 'akita', region: 'tohoku', lat: 39.719, lng: 140.102 },
  { name: '山形', full: '山形県', romaji: 'yamagata', region: 'tohoku', lat: 38.24, lng: 140.363 },
  { name: '福島', full: '福島県', romaji: 'fukushima', region: 'tohoku', lat: 37.75, lng: 140.468 },
  { name: '茨城', full: '茨城県', romaji: 'ibaraki', region: 'kanto', lat: 36.342, lng: 140.447 },
  { name: '栃木', full: '栃木県', romaji: 'tochigi', region: 'kanto', lat: 36.566, lng: 139.884 },
  { name: '群馬', full: '群馬県', romaji: 'gunma', region: 'kanto', lat: 36.391, lng: 139.061 },
  { name: '埼玉', full: '埼玉県', romaji: 'saitama', region: 'kanto', lat: 35.857, lng: 139.649 },
  { name: '千葉', full: '千葉県', romaji: 'chiba', region: 'kanto', lat: 35.605, lng: 140.123 },
  { name: '東京', full: '東京都', romaji: 'tokyo', region: 'kanto', lat: 35.69, lng: 139.692 },
  { name: '神奈川', full: '神奈川県', romaji: 'kanagawa', region: 'kanto', lat: 35.448, lng: 139.642 },
  { name: '新潟', full: '新潟県', romaji: 'niigata', region: 'chubu', lat: 37.902, lng: 139.023 },
  { name: '富山', full: '富山県', romaji: 'toyama', region: 'chubu', lat: 36.695, lng: 137.211 },
  { name: '石川', full: '石川県', romaji: 'ishikawa', region: 'chubu', lat: 36.594, lng: 136.626 },
  { name: '福井', full: '福井県', romaji: 'fukui', region: 'chubu', lat: 36.065, lng: 136.222 },
  { name: '山梨', full: '山梨県', romaji: 'yamanashi', region: 'chubu', lat: 35.664, lng: 138.568 },
  { name: '長野', full: '長野県', romaji: 'nagano', region: 'chubu', lat: 36.651, lng: 138.181 },
  { name: '岐阜', full: '岐阜県', romaji: 'gifu', region: 'chubu', lat: 35.391, lng: 136.722 },
  { name: '静岡', full: '静岡県', romaji: 'shizuoka', region: 'chubu', lat: 34.977, lng: 138.383 },
  { name: '愛知', full: '愛知県', romaji: 'aichi', region: 'chubu', lat: 35.18, lng: 136.907 },
  { name: '三重', full: '三重県', romaji: 'mie', region: 'kinki', lat: 34.73, lng: 136.509 },
  { name: '滋賀', full: '滋賀県', romaji: 'shiga', region: 'kinki', lat: 35.004, lng: 135.868 },
  { name: '京都', full: '京都府', romaji: 'kyoto', region: 'kinki', lat: 35.021, lng: 135.756 },
  { name: '大阪', full: '大阪府', romaji: 'osaka', region: 'kinki', lat: 34.686, lng: 135.52 },
  { name: '兵庫', full: '兵庫県', romaji: 'hyogo', region: 'kinki', lat: 34.691, lng: 135.183 },
  { name: '奈良', full: '奈良県', romaji: 'nara', region: 'kinki', lat: 34.685, lng: 135.833 },
  { name: '和歌山', full: '和歌山県', romaji: 'wakayama', region: 'kinki', lat: 34.226, lng: 135.168 },
  { name: '鳥取', full: '鳥取県', romaji: 'tottori', region: 'chugoku', lat: 35.504, lng: 134.238 },
  { name: '島根', full: '島根県', romaji: 'shimane', region: 'chugoku', lat: 35.472, lng: 133.051 },
  { name: '岡山', full: '岡山県', romaji: 'okayama', region: 'chugoku', lat: 34.662, lng: 133.935 },
  { name: '広島', full: '広島県', romaji: 'hiroshima', region: 'chugoku', lat: 34.396, lng: 132.459 },
  { name: '山口', full: '山口県', romaji: 'yamaguchi', region: 'chugoku', lat: 34.186, lng: 131.471 },
  { name: '徳島', full: '徳島県', romaji: 'tokushima', region: 'shikoku', lat: 34.066, lng: 134.559 },
  { name: '香川', full: '香川県', romaji: 'kagawa', region: 'shikoku', lat: 34.34, lng: 134.043 },
  { name: '愛媛', full: '愛媛県', romaji: 'ehime', region: 'shikoku', lat: 33.842, lng: 132.766 },
  { name: '高知', full: '高知県', romaji: 'kochi', region: 'shikoku', lat: 33.56, lng: 133.531 },
  { name: '福岡', full: '福岡県', romaji: 'fukuoka', region: 'kyushu_okinawa', lat: 33.607, lng: 130.418 },
  { name: '佐賀', full: '佐賀県', romaji: 'saga', region: 'kyushu_okinawa', lat: 33.249, lng: 130.299 },
  { name: '長崎', full: '長崎県', romaji: 'nagasaki', region: 'kyushu_okinawa', lat: 32.745, lng: 129.874 },
  { name: '熊本', full: '熊本県', romaji: 'kumamoto', region: 'kyushu_okinawa', lat: 32.79, lng: 130.742 },
  { name: '大分', full: '大分県', romaji: 'oita', region: 'kyushu_okinawa', lat: 33.238, lng: 131.613 },
  { name: '宮崎', full: '宮崎県', romaji: 'miyazaki', region: 'kyushu_okinawa', lat: 31.911, lng: 131.424 },
  { name: '鹿児島', full: '鹿児島県', romaji: 'kagoshima', region: 'kyushu_okinawa', lat: 31.56, lng: 130.558 },
  { name: '沖縄', full: '沖縄県', romaji: 'okinawa', region: 'kyushu_okinawa', lat: 26.212, lng: 127.681 },
];

// 長音の表記ゆれ(ou / oo)
const ROMAJI_ALIASES: Record<string, string> = {
  hokkaidou: 'hokkaido',
  toukyou: 'tokyo',
  tokyou: 'tokyo',
  kyouto: 'kyoto',
  oosaka: 'osaka',
  hyougo: 'hyogo',
  ooita: 'oita',
  kouchi: 'kochi',
  gumma: 'gunma',
};

const BY_ROMAJI = new Map(PREFECTURES.map((p) => [p.romaji, p]));

function normalizeRomaji(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Tōkyō → Tokyo
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function lookupRomaji(key: string): Prefecture | undefined {
  return BY_ROMAJI.get(key) ?? BY_ROMAJI.get(ROMAJI_ALIASES[key] ?? '');
}

/** start.gg の addrState("Tokyo", "東京都", "Tokyo-to", "Osaka Prefecture" 等)から都道府県を引く */
export function findPrefecture(addrState: string | null | undefined): Prefecture | null {
  if (!addrState) return null;
  const s = addrState.trim();
  if (!s) return null;

  const jp = PREFECTURES.find((p) => s.startsWith(p.full) || s === p.name);
  if (jp) return jp;

  const key = normalizeRomaji(s);
  const direct = lookupRomaji(key);
  if (direct) return direct;
  // "kyoto" のように接尾辞と同じ綴りで終わる県があるので、外した結果が一致した場合だけ採用する
  for (const suffix of ['prefecture', 'metropolis', 'ken', 'fu', 'to']) {
    if (key.endsWith(suffix)) {
      const hit = lookupRomaji(key.slice(0, -suffix.length));
      if (hit) return hit;
    }
  }
  return null;
}

/** addrState が空のときのフォールバック。最寄りの県庁所在地で推定する */
export function nearestPrefecture(lat: number, lng: number): Prefecture {
  let best = PREFECTURES[0];
  let bestDist = Infinity;
  for (const p of PREFECTURES) {
    const dLat = p.lat - lat;
    const dLng = (p.lng - lng) * Math.cos((lat * Math.PI) / 180);
    const d = dLat * dLat + dLng * dLng;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function resolveJpLocation(input: {
  addrState: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
}): { region: JpRegion | null; prefecture: string | null } {
  const pref =
    findPrefecture(input.addrState) ??
    (input.lat != null && input.lng != null ? nearestPrefecture(input.lat, input.lng) : null);
  return pref ? { region: pref.region, prefecture: pref.full } : { region: null, prefecture: null };
}

/** start.gg の countryCode は基本 ISO alpha-2 だが、まれに国名で入っているので揃える */
export function normalizeCountry(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  if (/^japan$|^日本$/i.test(c)) return 'JP';
  if (/^united states|^usa$/i.test(c)) return 'US';
  return null;
}

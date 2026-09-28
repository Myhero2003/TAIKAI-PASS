import { VIDEOGAME_COLORS } from '@/config';
import type { Theme } from '@/lib/model/types';

type Rgb = [number, number, number];
type Hsl = [number, number, number]; // h: 0-360, s/l: 0-1

export function hexToRgb(hex: string): Rgb {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl([r, g, b]: Rgb): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb([h, s, l]: Hsl): Rgb {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hsl(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb([h, clamp(s, 0, 1), clamp(l, 0, 1)]));
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 基準色1つからカードで使う色一式を作る */
export function makeTheme(baseHex: string, source: Theme['source']): Theme {
  const [h, s, l] = rgbToHsl(hexToRgb(baseHex));
  // 無彩色に近いロゴでもストラップらしく見えるよう、彩度と明度を扱いやすい範囲に寄せる
  const sat = s < 0.08 ? s : clamp(s, 0.45, 0.85);
  const light = clamp(l, 0.3, 0.55);
  const primary = hsl(h, sat, light);
  const onPrimary = contrastRatio(primary, '#ffffff') >= contrastRatio(primary, '#141414') ? '#ffffff' : '#141414';
  return {
    primary,
    gradient: [hsl(h + 12, sat, light + 0.14), hsl(h - 10, sat, light - 0.1)],
    tint: hsl(h, Math.min(sat, 0.6), 0.93),
    onPrimary,
    hue: Math.round(h),
    source,
  };
}

/** 大会 ID から決まる色(毎回同じ色になる) */
export function fallbackTheme(seed: string): Theme {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return makeTheme(hsl(hash % 360, 0.65, 0.45), 'fallback');
}

export function videogameColor(gameName: string): string | null {
  return VIDEOGAME_COLORS.find(({ pattern }) => pattern.test(gameName))?.color ?? null;
}

/**
 * ロゴ画像のピクセル(RGB 並び)から代表色を選ぶ。
 * 白・黒・灰色の背景や文字を除き、彩度の高い色相ごとに重みを集計して最大のものを返す。
 * 色がほとんどない(モノクロのロゴ)場合は null。
 */
export function dominantColor(pixels: Uint8Array | Buffer, channels = 3): string | null {
  const BUCKETS = 36;
  const weight = new Array<number>(BUCKETS).fill(0);
  const sum = Array.from({ length: BUCKETS }, () => [0, 0, 0]);
  let total = 0;
  let count = 0;

  for (let i = 0; i + 2 < pixels.length; i += channels) {
    const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const [h, s, l] = rgbToHsl(rgb);
    count++;
    if (s < 0.25 || l < 0.12 || l > 0.9) continue;
    const w = s * (1 - Math.abs(l - 0.5));
    const b = Math.floor(h / (360 / BUCKETS)) % BUCKETS;
    weight[b] += w;
    sum[b][0] += rgb[0] * w;
    sum[b][1] += rgb[1] * w;
    sum[b][2] += rgb[2] * w;
    total += w;
  }
  if (count === 0 || total < count * 0.03) return null;

  // 隣接バケットも足して、グラデーションのロゴで色相が割れても拾えるようにする
  let best = 0;
  let bestScore = -1;
  for (let b = 0; b < BUCKETS; b++) {
    const score = weight[b] + 0.5 * (weight[(b + 1) % BUCKETS] + weight[(b + BUCKETS - 1) % BUCKETS]);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  const w = weight[best];
  return rgbToHex([sum[best][0] / w, sum[best][1] / w, sum[best][2] / w]);
}

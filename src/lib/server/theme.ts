import 'server-only';
import sharp from 'sharp';
import { THEME_OVERRIDES } from '@/config';
import type { GameRef, Theme } from '@/lib/model/types';
import type { RawTournament } from '@/lib/startgg/raw';
import { pickImage } from '@/lib/transform/card';
import { dominantColor, fallbackTheme, makeTheme, videogameColor } from '@/lib/transform/theme';

const colorCache = new Map<string, string | null>();

async function logoColor(url: string): Promise<string | null> {
  if (colorCache.has(url)) return colorCache.get(url)!;
  let color: string | null = null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const pixels = await sharp(Buffer.from(await res.arrayBuffer()))
        .flatten({ background: '#ffffff' }) // 透過 PNG の透明部分は白扱い(= 集計から除外)
        .resize(32, 32, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer();
      color = dominantColor(pixels, 3);
    }
  } catch {
    color = null;
  }
  colorCache.set(url, color);
  return color;
}

/** 優先順: 手動設定 → ロゴから抽出 → ゲームタイトル既定色 → 大会 ID から決まる色 */
export async function resolveTheme(t: RawTournament, primaryGame: GameRef | null): Promise<Theme> {
  const override = t.slug ? THEME_OVERRIDES[t.slug] : undefined;
  if (override) return makeTheme(override, 'manual');

  const logo = pickImage(t.images, 'profile');
  if (logo) {
    const color = await logoColor(logo);
    if (color) return makeTheme(color, 'logo');
  }

  const gameColor = primaryGame ? videogameColor(primaryGame.name) : null;
  if (gameColor) return makeTheme(gameColor, 'videogame');

  return fallbackTheme(String(t.id));
}

import { JP_REGION_LABEL, type EventFormat, type PassCard } from '@/lib/model/types';
import { countryName, flagEmoji } from './sortFilter';

const dateFmt = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function placeLabel(card: PassCard): string {
  const { location, isOnline } = card.tournament;
  if (isOnline) return 'オンライン';
  if (location.country === 'JP') {
    return location.prefecture ?? (location.region ? JP_REGION_LABEL[location.region] : '日本');
  }
  if (location.country) {
    const name = countryName(location.country);
    return `${flagEmoji(location.country)} ${location.city ? `${location.city}, ` : ''}${name}`;
  }
  return location.city ?? '';
}

export const FORMAT_LABEL: Record<EventFormat, string> = {
  singles: 'シングルス',
  doubles: 'ダブルス',
  team: 'チーム戦',
  squad_strike: 'Squad Strike',
  other: 'その他',
};

export function percent(v: number | null, digits = 0): string {
  return v == null ? '—' : `${(v * 100).toFixed(digits)}%`;
}

/** ロゴが無いときに表面に出す頭文字 */
export function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-Za-z0-9]/.test(words[0])) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return [...(words[0] ?? name)].slice(0, 2).join('').toUpperCase();
}

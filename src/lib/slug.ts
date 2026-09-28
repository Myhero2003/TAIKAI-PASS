/**
 * start.gg のプロフィール指定を user slug の識別子部分に揃える。
 * 受け付ける形式:
 *   https://www.start.gg/user/1a2b3c4d
 *   start.gg/user/1a2b3c4d/details
 *   user/1a2b3c4d
 *   1a2b3c4d
 */
export function parseUserSlug(input: string): string | null {
  const s = input.trim();
  const fromPath = s.match(/(?:^|\/)user\/([a-z0-9-]+)/i);
  if (fromPath) return fromPath[1].toLowerCase();
  if (/^[a-z0-9-]{4,}$/i.test(s)) return s.toLowerCase();
  return null;
}

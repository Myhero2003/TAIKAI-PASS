import { NextResponse } from 'next/server';
import { fetchCard } from '@/lib/server/player';
import { StartggError } from '@/lib/startgg/client';

export const maxDuration = 60;

// start.gg 側の訂正・削除を反映させるため、確定済みでも CDN に置くのは1日まで(API 規約 4章)
const DAY = 24 * 3600;

/** GET /api/cards/:tournamentId?userId=123&name=Tag */
export async function GET(req: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') ?? '';
  const name = url.searchParams.get('name') ?? '';
  if (!/^\d+$/.test(tournamentId) || !/^\d+$/.test(userId)) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 });
  }

  try {
    const { card, settled } = await fetchCard(tournamentId, userId, name);
    const cache = settled
      ? `public, s-maxage=${DAY}, stale-while-revalidate=${DAY}`
      : 'public, s-maxage=300, stale-while-revalidate=3600';
    return NextResponse.json({ card, settled }, { headers: { 'Cache-Control': cache } });
  } catch (e) {
    if (e instanceof StartggError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

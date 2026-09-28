import { NextResponse } from 'next/server';
import { fetchPlayerIndex } from '@/lib/server/player';
import { parseUserSlug } from '@/lib/slug';
import { StartggError } from '@/lib/startgg/client';

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = parseUserSlug(decodeURIComponent((await params).slug));
  if (!slug) return NextResponse.json({ error: 'start.gg のプロフィール URL を確認してください' }, { status: 400 });

  try {
    const index = await fetchPlayerIndex(slug);
    return NextResponse.json(index, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

function errorResponse(e: unknown) {
  if (e instanceof StartggError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
}

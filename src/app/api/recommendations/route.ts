import { NextResponse } from 'next/server';
import { getGameShelves } from '@/lib/server/topPlayers';

export const maxDuration = 60;

/** ゲームごとの上位入賞者。誰が見ても同じ内容なので CDN にも置く */
export async function GET() {
  const { shelves, complete } = await getGameShelves();
  return NextResponse.json(
    { shelves },
    {
      headers: {
        // 一部のゲームで取得に失敗したときは、早めに取り直す
        'Cache-Control': complete
          ? 'public, s-maxage=86400, stale-while-revalidate=86400'
          : 'public, s-maxage=300',
      },
    },
  );
}

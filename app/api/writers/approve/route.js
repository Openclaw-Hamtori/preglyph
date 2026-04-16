
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: 'Direct writer approval is disabled. Presence verification must authorize writing.',
    },
    { status: 410 },
  );
}

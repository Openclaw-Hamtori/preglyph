import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const address = payload?.address || '';
    return NextResponse.json({
      ok: true,
      address,
      approved: true,
      result: {
        skipped: true,
        approved: true,
        address,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to enable writing.',
      },
      { status: 500 },
    );
  }
}

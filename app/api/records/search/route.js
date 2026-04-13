import { NextResponse } from 'next/server';
import { getRecordByTxHash } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json({ ok: false, error: 'txHash is required.' }, { status: 400 });
    }

    const record = await getRecordByTxHash(txHash);
    if (!record) {
      return NextResponse.json({ ok: false, error: 'No Preglyph record found for that transaction.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to search transaction.' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { getRecordByTxHash, getRecords } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash')?.trim();
    const q = searchParams.get('q')?.trim();

    if (txHash) {
      const record = await getRecordByTxHash(txHash);
      if (!record) {
        return NextResponse.json({ ok: false, error: 'No Preglyph record found for that transaction.' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, record });
    }

    if (q) {
      const records = await getRecords();
      const lowered = q.toLowerCase();
      const filtered = records.filter((record) => record.content.toLowerCase().includes(lowered));
      return NextResponse.json({ ok: true, records: filtered, query: q });
    }

    return NextResponse.json({ ok: false, error: 'txHash or q is required.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to search records.' },
      { status: 500 },
    );
  }
}

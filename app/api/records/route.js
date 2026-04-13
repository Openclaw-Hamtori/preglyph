import { NextResponse } from 'next/server';
import { getRecords, getNetworkSummary } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const author = searchParams.get('author') || undefined;
    const [records, network] = await Promise.all([getRecords({ author }), getNetworkSummary()]);

    return NextResponse.json({
      ok: true,
      records,
      network,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load records.' },
      { status: 500 },
    );
  }
}

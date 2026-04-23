import { NextResponse } from 'next/server';
import { getNetworkSummary, getRecordsPage, getRecordTotalCount } from '@/lib/chain';
import { INITIAL_RECORDS_LIMIT, parseRecordsCursor, sanitizeRecordsLimit } from '@/lib/records-pagination.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const author = searchParams.get('author') || undefined;
    const cursor = parseRecordsCursor(searchParams.get('cursor'));
    const limit = sanitizeRecordsLimit(searchParams.get('limit'), {
      fallback: INITIAL_RECORDS_LIMIT,
      maximum: INITIAL_RECORDS_LIMIT,
    });
    const [{ records, nextCursor, hasMore }, network, totalCount] = await Promise.all([
      getRecordsPage({ author, limit, cursor }),
      getNetworkSummary(),
      getRecordTotalCount(),
    ]);

    return NextResponse.json({
      ok: true,
      records,
      network,
      pageInfo: {
        nextCursor,
        hasMore,
        totalCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load records.' },
      { status: 500 },
    );
  }
}

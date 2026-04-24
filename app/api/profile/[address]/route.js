import { NextResponse } from 'next/server';
import { INITIAL_RECORDS_LIMIT, parseRecordsCursor, sanitizeRecordsLimit } from '@/lib/records-pagination.mjs';
import { loadProfilePage } from '@/lib/profile-page.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const { address } = await params;
    const cursor = parseRecordsCursor(searchParams.get('cursor'));
    const limit = sanitizeRecordsLimit(searchParams.get('limit'), {
      fallback: INITIAL_RECORDS_LIMIT,
      maximum: INITIAL_RECORDS_LIMIT,
    });
    const profile = await loadProfilePage({ address, limit, cursor });

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load profile.' },
      { status: 500 },
    );
  }
}

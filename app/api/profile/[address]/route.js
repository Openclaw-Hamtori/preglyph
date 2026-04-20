
import { NextResponse } from 'next/server';
import { getRecords } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { address } = params;
    const records = await getRecords({ author: address });

    return NextResponse.json({
      ok: true,
      profile: {
        address,
        records,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to load profile.' },
      { status: 500 },
    );
  }
}

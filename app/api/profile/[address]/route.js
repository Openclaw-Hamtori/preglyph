
import { NextResponse } from 'next/server';
import { getOnchainWriterStatus, getRecords } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { address } = params;
    const [onchainApproved, records] = await Promise.all([
      getOnchainWriterStatus(address),
      getRecords({ author: address }),
    ]);

    return NextResponse.json({
      ok: true,
      profile: {
        address,
        onchainApproved,
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

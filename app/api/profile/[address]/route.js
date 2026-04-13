import { NextResponse } from 'next/server';
import { getPresenceProfile } from '@/lib/presence';
import { getOnchainWriterStatus, getRecords } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { address } = params;
    const [presence, onchainApproved, records] = await Promise.all([
      getPresenceProfile(address),
      getOnchainWriterStatus(address),
      getRecords({ author: address }),
    ]);

    return NextResponse.json({
      ok: true,
      profile: {
        address,
        presence,
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

import { NextResponse } from 'next/server';
import { verifyLivePresenceForAddress } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const address = body?.address;
    const requestId = body?.requestId;
    const proof = body?.proof;

    if (!address || !requestId || !proof) {
      return NextResponse.json(
        { ok: false, error: 'address, requestId, and proof are required.' },
        { status: 400 },
      );
    }

    const result = await verifyLivePresenceForAddress({ address, requestId, proof });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Presence verification failed.' },
      { status: 500 },
    );
  }
}

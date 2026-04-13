import { NextResponse } from 'next/server';
import { createPresenceRequest } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const address = body?.address;

    if (!address) {
      return NextResponse.json({ ok: false, error: 'Wallet address is required.' }, { status: 400 });
    }

    const presenceRequest = await createPresenceRequest(address);
    return NextResponse.json({ ok: true, request: presenceRequest });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to create a Presence request.' },
      { status: 500 },
    );
  }
}

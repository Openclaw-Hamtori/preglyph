import { NextResponse } from 'next/server';
import { verifySandboxPresenceForAddress } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const address = body?.address;

    if (!address) {
      return NextResponse.json({ ok: false, error: 'Wallet address is required.' }, { status: 400 });
    }

    const result = await verifySandboxPresenceForAddress(address);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Presence sandbox verification failed.' },
      { status: 500 },
    );
  }
}

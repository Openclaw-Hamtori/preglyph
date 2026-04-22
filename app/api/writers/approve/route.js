
import { NextResponse } from 'next/server';
import { ensureWriterApproval } from '@/lib/chain';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = await request.json();
    const address = payload?.address || '';
    const result = await ensureWriterApproval(address, true);
    return NextResponse.json({
      ok: true,
      address,
      approved: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Failed to enable writing.',
      },
      { status: 500 },
    );
  }
}

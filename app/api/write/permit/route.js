import { randomBytes } from 'node:crypto';

import { isAddress } from 'ethers';
import { NextResponse } from 'next/server';

import { assertContractConfigured } from '@/lib/config';
import { signWritePermit } from '@/lib/write-permit.mjs';

export const dynamic = 'force-dynamic';

const DEFAULT_TTL_SECONDS = 300;

export async function POST(request) {
  try {
    const { author, content } = await request.json();
    const normalizedAuthor = String(author || '').trim();
    const normalizedContent = String(content || '');

    if (!isAddress(normalizedAuthor)) {
      return NextResponse.json({ ok: false, error: 'Valid author address is required.' }, { status: 400 });
    }

    if (!normalizedContent.trim()) {
      return NextResponse.json({ ok: false, error: 'Content is required.' }, { status: 400 });
    }

    const { contractAddress, chainId, adminPrivateKey } = assertContractConfigured();
    if (!adminPrivateKey) {
      return NextResponse.json({ ok: false, error: 'Preglyph write signer is not configured.' }, { status: 500 });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;
    const nonce = `0x${randomBytes(32).toString('hex')}`;
    const permit = await signWritePermit({
      signerPrivateKey: adminPrivateKey,
      contractAddress,
      chainId,
      author: normalizedAuthor,
      content: normalizedContent,
      expiresAt,
      nonce,
    });

    return NextResponse.json({
      ok: true,
      permit: {
        expiresAt: permit.expiresAt,
        nonce: permit.nonce,
        signature: permit.signature,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to create write permit.' },
      { status: 500 },
    );
  }
}

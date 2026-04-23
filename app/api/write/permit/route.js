import { randomBytes } from 'node:crypto';

import { Contract, isAddress, JsonRpcProvider } from 'ethers';
import { NextResponse } from 'next/server';

import { assertContractConfigured } from '@/lib/config';
import { getWriteFeeQuote } from '@/lib/eth-usd-quote.mjs';
import { getRecordContentValidationError } from '@/lib/record-content-policy.mjs';
import { verifyWritePermitAuth } from '@/lib/write-permit-auth.mjs';
import { signWritePermit } from '@/lib/write-permit.mjs';

export const dynamic = 'force-dynamic';

const DEFAULT_TTL_SECONDS = 300;
const PREGLYPH_TREASURY_ABI = ['function treasury() view returns (address)'];

async function assertTreasuryMatchesContract({ rpcUrl, contractAddress, expectedTreasuryAddress }) {
  const provider = new JsonRpcProvider(rpcUrl);
  try {
    const contract = new Contract(contractAddress, PREGLYPH_TREASURY_ABI, provider);
    const actualTreasuryAddress = String(await contract.treasury()).toLowerCase();
    if (actualTreasuryAddress !== String(expectedTreasuryAddress).toLowerCase()) {
      throw new Error('Configured fee treasury does not match the deployed contract treasury.');
    }
  } finally {
    provider.destroy?.();
  }
}

export async function POST(request) {
  try {
    const { author, content, issuedAt, authSignature } = await request.json();
    const normalizedAuthor = String(author || '').trim();
    const normalizedContent = String(content || '');
    const normalizedIssuedAt = Number(issuedAt);
    const normalizedAuthSignature = String(authSignature || '').trim();

    if (!isAddress(normalizedAuthor)) {
      return NextResponse.json({ ok: false, error: 'Valid author address is required.' }, { status: 400 });
    }

    const contentValidationError = getRecordContentValidationError(normalizedContent);
    if (contentValidationError) {
      return NextResponse.json({ ok: false, error: contentValidationError }, { status: 400 });
    }

    const {
      contractAddress,
      chainId,
      adminPrivateKey,
      rpcUrl,
      feeUsdCents,
      feeTreasuryAddress,
      feeQuoteTtlSeconds,
      feeOverrideWei,
      chainlinkEthUsdFeed,
    } = assertContractConfigured();

    const hasValidAuth = verifyWritePermitAuth({
      author: normalizedAuthor,
      content: normalizedContent,
      chainId,
      contractAddress,
      issuedAt: normalizedIssuedAt,
      signature: normalizedAuthSignature,
    });

    if (!hasValidAuth) {
      return NextResponse.json({ ok: false, error: 'Wallet signature is required to authorize this write.' }, { status: 401 });
    }

    if (!adminPrivateKey) {
      return NextResponse.json({ ok: false, error: 'Preglyph write signer is not configured.' }, { status: 500 });
    }

    if (feeUsdCents <= 0 || !feeTreasuryAddress) {
      return NextResponse.json({ ok: false, error: 'Preglyph fee configuration is incomplete.' }, { status: 500 });
    }

    const feeQuote = await getWriteFeeQuote({
      rpcUrl,
      usdCents: feeUsdCents,
      overrideWei: feeOverrideWei,
      feedAddress: chainlinkEthUsdFeed,
      maxAgeSeconds: feeQuoteTtlSeconds || DEFAULT_TTL_SECONDS,
    });
    await assertTreasuryMatchesContract({
      rpcUrl,
      contractAddress,
      expectedTreasuryAddress: feeTreasuryAddress,
    });
    const expiresAt = Math.floor(Date.now() / 1000) + (feeQuoteTtlSeconds || DEFAULT_TTL_SECONDS);
    const nonce = `0x${randomBytes(32).toString('hex')}`;
    const permit = await signWritePermit({
      signerPrivateKey: adminPrivateKey,
      contractAddress,
      chainId,
      author: normalizedAuthor,
      content: normalizedContent,
      expiresAt,
      nonce,
      feeWei: feeQuote.feeWei,
    });

    return NextResponse.json({
      ok: true,
      permit: {
        expiresAt: permit.expiresAt,
        nonce: permit.nonce,
        feeWei: permit.feeWei.toString(),
        feeUsdCents,
        signature: permit.signature,
      },
      quote: {
        source: feeQuote.source,
        ethUsdPrice: feeQuote.ethUsdPrice,
        updatedAt: feeQuote.updatedAt,
        feedAddress: feeQuote.feedAddress,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to create write permit.' },
      { status: 500 },
    );
  }
}

import { randomBytes } from 'node:crypto';

import { Contract, isAddress } from 'ethers';
import { NextResponse } from 'next/server';

import { assertContractConfigured } from '@/lib/config';
import { getWriteFeeQuote } from '@/lib/eth-usd-quote.mjs';
import { getRateLimitKeyFromHeaders, createMemoryRateLimiter } from '@/lib/rate-limit.mjs';
import { getSharedRpcProvider } from '@/lib/rpc-provider.mjs';
import { getRecordContentValidationError } from '@/lib/record-content-policy.mjs';
import { verifyWritePermitAuth } from '@/lib/write-permit-auth.mjs';
import { assertPermitSignerMatchesConfiguredAddress, signWritePermit } from '@/lib/write-permit.mjs';

export const dynamic = 'force-dynamic';

const DEFAULT_TTL_SECONDS = 300;
const PERMIT_RATE_LIMIT_WINDOW_MS = 60_000;
const PERMIT_RATE_LIMIT_MAX_REQUESTS = 10;
const permitRateLimiter = createMemoryRateLimiter({
  windowMs: PERMIT_RATE_LIMIT_WINDOW_MS,
  limit: PERMIT_RATE_LIMIT_MAX_REQUESTS,
});
const PREGLYPH_REGISTRY_GUARD_ABI = [
  'function treasury() view returns (address)',
  'function permitSigner() view returns (address)',
];

async function assertContractWriteGuards({ rpcUrl, contractAddress, expectedTreasuryAddress, signerPrivateKey }) {
  const provider = getSharedRpcProvider(rpcUrl);
  const contract = new Contract(contractAddress, PREGLYPH_REGISTRY_GUARD_ABI, provider);
  const [actualTreasuryAddress, actualPermitSignerAddress] = await Promise.all([
    contract.treasury(),
    contract.permitSigner(),
  ]);

  if (String(actualTreasuryAddress).toLowerCase() !== String(expectedTreasuryAddress).toLowerCase()) {
    throw new Error('Configured fee treasury does not match the deployed contract treasury.');
  }

  assertPermitSignerMatchesConfiguredAddress({
    signerPrivateKey,
    expectedSignerAddress: actualPermitSignerAddress,
  });
}

export async function POST(request) {
  try {
    const rateLimit = permitRateLimiter.consume({
      key: getRateLimitKeyFromHeaders(request.headers),
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many permit requests. Try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

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
      chainId,
      maxAgeSeconds: feeQuoteTtlSeconds || DEFAULT_TTL_SECONDS,
    });
    await assertContractWriteGuards({
      rpcUrl,
      contractAddress,
      expectedTreasuryAddress: feeTreasuryAddress,
      signerPrivateKey: adminPrivateKey,
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

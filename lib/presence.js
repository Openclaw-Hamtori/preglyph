import path from 'node:path';
import crypto from 'node:crypto';
import {
  createMemoryReplayProtection,
  createStoreBackedSignatureVerifier,
  verifyPresence,
} from '@presence/verifier-sdk';
import { loadPresenceSandboxFixture } from '@presence/verifier-sdk/sandbox';
import { getServerRuntimeConfig } from './config';
import { ensureWriterApproval } from './chain';
import {
  appendPresenceAudit,
  getPresenceBinding,
  getPresenceRequest,
  getWriterStatus,
  savePresenceBinding,
  savePresenceRequest,
  setWriterStatus,
} from './storage';

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  '../presence-auth/packages/presence-verifier/fixtures/presence-sandbox',
);

const replayProtection = createMemoryReplayProtection({ ttlMs: 5 * 60 * 1000, maxEntries: 1024 });

async function buildSandboxVerifier(fixture) {
  return createStoreBackedSignatureVerifier({
    resolveByIss: async ({ iss }) => {
      if (!fixture.signingSeed) return null;
      return iss === fixture.proof?.claims?.iss ? { seed: fixture.signingSeed } : null;
    },
  });
}

function parsePresenceSeedRegistry(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    throw new Error('PREGLYPH_PRESENCE_SEEDS_JSON is not valid JSON.');
  }
}

function buildLiveSignatureVerifier(seedRegistry) {
  return createStoreBackedSignatureVerifier({
    resolveByIss: async ({ iss }) => {
      const entry = seedRegistry[iss];
      if (!entry?.seed) return null;
      return {
        seed: entry.seed,
        publicKey: entry.publicKey,
      };
    },
  });
}

export async function createPresenceRequest(address) {
  const config = getServerRuntimeConfig();
  const normalized = address.toLowerCase();
  const request = {
    id: crypto.randomUUID(),
    accountId: normalized,
    status: 'pending',
    createdAt: Date.now(),
    expiresAtMs: Date.now() + 5 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
    flowType: config.presenceFlowType,
    submitTarget: {
      endpoint_ref: config.presenceEndpointRef,
      auth_context: config.presenceAuthContext,
    },
  };
  await savePresenceRequest(request);
  return {
    requestId: request.id,
    sessionId: request.id,
    nonce: request.nonce,
    expiresAtMs: request.expiresAtMs,
    serviceId: config.presenceServiceId,
    flowType: request.flowType,
    submitTarget: request.submitTarget,
  };
}

export async function verifyLivePresenceForAddress({ address, requestId, proof }) {
  const config = getServerRuntimeConfig();
  const seedRegistry = parsePresenceSeedRegistry(config.presenceSeedsJson);
  const normalized = address.toLowerCase();
  const request = await getPresenceRequest(requestId);
  if (!request || request.accountId !== normalized) {
    throw new Error('Presence request was not found for this wallet.');
  }

  if (!Object.keys(seedRegistry).length) {
    throw new Error('Live Presence verification is not configured yet. Set PREGLYPH_PRESENCE_SEEDS_JSON with issuer seed material.');
  }

  const signatureVerifier = buildLiveSignatureVerifier(seedRegistry);
  const verification = await verifyPresence({
    proof,
    expected: {
      protocolVersion: 'v0',
      serviceId: config.presenceServiceId,
      flowType: request.flowType,
      sessionId: request.id,
      sessionHandle: request.id,
      expectedNonce: request.nonce,
      sessionExpiresAtMs: request.expiresAtMs,
      maxProofAgeMs: 5 * 60 * 1000,
      submitTarget: request.submitTarget,
    },
    signatureVerifier,
    replayProtection,
  });

  await appendPresenceAudit({
    type: 'presence_verify_attempt',
    walletAddress: normalized,
    requestId,
    verdict: verification.verdict,
    reasonCode: verification.reasonCode,
    at: new Date().toISOString(),
  });

  if (!verification.ok || !verification.claims) {
    throw new Error(`Presence verification failed: ${verification.reasonCode}`);
  }

  const existingBinding = await getPresenceBinding(normalized);
  if (
    existingBinding &&
    (existingBinding.installationId !== verification.claims.installationId || existingBinding.iss !== verification.claims.iss)
  ) {
    throw new Error('Presence binding mismatch. Recovery is required before this wallet can write.');
  }

  await savePresenceBinding(normalized, {
    installationId: verification.claims.installationId,
    iss: verification.claims.iss,
    publicKey: proof?.key?.public_key || null,
    seed: null,
    linkedAt: existingBinding?.linkedAt || new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
    status: 'linked',
  });

  const chainResult = await ensureWriterApproval(normalized, true);
  const writer = await setWriterStatus(normalized, {
    status: 'passed',
    verifier: 'presence-live',
    verifiedAt: new Date().toISOString(),
    proofIss: verification.claims.iss,
    installationId: verification.claims.installationId,
    chainGrantTxHash: chainResult.txHash || null,
  });

  return {
    writer,
    verifierResult: verification,
    chainResult,
  };
}

export async function verifySandboxPresenceForAddress(address) {
  const config = getServerRuntimeConfig();
  const fixture = await loadPresenceSandboxFixture('valid-verify-proof', FIXTURES_DIR);
  const signatureVerifier = await buildSandboxVerifier(fixture);
  const result = await verifyPresence({
    proof: fixture.proof,
    expected: {
      protocolVersion: 'v0',
      serviceId: config.presenceServiceId,
      flowType: config.presenceFlowType,
      sessionId: fixture.verifierInput.expected.sessionId,
      sessionHandle: fixture.verifierInput.expected.sessionHandle,
      expectedNonce: fixture.proof.claims.nonce,
      submitTarget: {
        endpoint_ref: config.presenceEndpointRef,
        auth_context: config.presenceAuthContext,
      },
      sessionExpiresAtMs: fixture.verifierInput.expected.sessionExpiresAtMs,
    },
    signatureVerifier,
  });

  if (!result.ok) {
    throw new Error(`Presence verification failed: ${result.reasonCode}`);
  }

  const chainResult = await ensureWriterApproval(address, true);
  const writer = await setWriterStatus(address, {
    status: 'passed',
    verifier: 'presence-sandbox',
    verifiedAt: new Date().toISOString(),
    proofIss: result.claims?.iss || fixture.proof.claims.iss,
    chainGrantTxHash: chainResult.txHash || null,
  });

  return {
    writer,
    verifierResult: result,
    chainResult,
  };
}

export async function getPresenceProfile(address) {
  const writer = await getWriterStatus(address);
  const binding = await getPresenceBinding(address);
  return {
    passed: writer?.status === 'passed',
    writer: writer || null,
    binding: binding || null,
  };
}

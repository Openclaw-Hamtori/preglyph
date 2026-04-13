import path from 'node:path';
import { createStoreBackedSignatureVerifier, verifyPresence } from '@presence/verifier-sdk';
import { loadPresenceSandboxFixture } from '@presence/verifier-sdk/sandbox';
import { getServerRuntimeConfig } from './config';
import { ensureWriterApproval } from './chain';
import { getWriterStatus, setWriterStatus } from './storage';

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  '../presence-auth/packages/presence-verifier/fixtures/presence-sandbox',
);

async function buildSandboxVerifier(fixture) {
  return createStoreBackedSignatureVerifier({
    resolveByIss: async ({ iss }) => {
      if (!fixture.signingSeed) return null;
      return iss === fixture.proof?.claims?.iss ? { seed: fixture.signingSeed } : null;
    },
  });
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
  return {
    passed: writer?.status === 'passed',
    writer: writer || null,
  };
}

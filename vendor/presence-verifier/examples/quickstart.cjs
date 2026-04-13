const path = require('path');
const {
  createStoreBackedSignatureVerifier,
  assertVerifiedPresenceResult,
  verifyPresence,
} = require('@presence/verifier-sdk');
const {
  loadPresenceSandboxFixture,
} = require('@presence/verifier-sdk/sandbox');

async function main() {
  const fixturesDir = path.resolve(__dirname, '../fixtures/presence-sandbox');
  const fixture = await loadPresenceSandboxFixture(
    'valid-verify-proof',
    fixturesDir,
  );

  const signatureVerifier = createStoreBackedSignatureVerifier({
    resolveByIss: async ({ iss }) => {
      if (!fixture.signingSeed) {
        return null;
      }
      const expectedIss = fixture.proof?.claims?.iss;
      return iss === expectedIss ? { seed: fixture.signingSeed } : null;
    },
  });

  const result = await verifyPresence({
    proof: fixture.proof,
    expected: fixture.verifierInput && fixture.verifierInput.expected,
    signatureVerifier,
  });

  assertVerifiedPresenceResult(result);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

const express = require('express');
const {
  createStoreBackedSignatureVerifier,
  verifyPresence,
} = require('@presence/verifier-sdk');

function buildExpectedContext({ body, serviceId, maxProofAgeMs }) {
  return {
    protocolVersion: 'v0',
    serviceId,
    flowType: body.flowType,
    sessionId: body.sessionId,
    sessionHandle: body.requestId,
    expectedNonce: body.expectedNonce,
    sessionExpiresAtMs: body.sessionExpiresAtMs,
    maxProofAgeMs,
    submitTarget: body.submitTarget,
  };
}

async function defaultResolveByIss() {
  return null;
}

async function defaultReplayProtection() {
  return { accepted: true, replayDetected: false };
}

function createPresenceVerifierApp(options = {}) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const serviceId = options.serviceId || process.env.PRESENCE_SERVICE_ID || 'example-service';
  const maxProofAgeMs = Number(
    options.maxProofAgeMs || process.env.PRESENCE_MAX_PROOF_AGE_MS || 30000,
  );
  const resolveByIss = options.resolveByIss || defaultResolveByIss;
  const replayProtection = options.replayProtection
    ? { consumeNonce: options.replayProtection }
    : { consumeNonce: defaultReplayProtection };

  const signatureVerifier = createStoreBackedSignatureVerifier({
    resolveByIss,
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, serviceId });
  });

  app.post('/presence/verify', async (req, res) => {
    const body = req.body || {};

    if (!body.proof) {
      return res.status(400).json({
        ok: false,
        message: 'Missing `proof` in request body.',
      });
    }

    const expected = buildExpectedContext({
      body,
      serviceId,
      maxProofAgeMs,
    });

    const result = await verifyPresence({
      proof: body.proof,
      expected,
      signatureVerifier,
      replayProtection,
    });

    const statusCode = result.ok
      ? 200
      : result.verdict === 'expired'
        ? 410
        : result.verdict === 'replay_detected'
          ? 409
          : 400;

    return res.status(statusCode).json(result);
  });

  return app;
}

module.exports = {
  createPresenceVerifierApp,
};

if (require.main === module) {
  const port = Number(process.env.PORT || 8789);
  const app = createPresenceVerifierApp();
  app.listen(port, () => {
    console.log(`Presence starter listening on http://localhost:${port}`);
  });
}

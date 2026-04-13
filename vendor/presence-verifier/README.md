# @presence/verifier-sdk

Presence verifier SDK for server-side proof verification.

This package is designed for the Stripe-like service side of Presence:
- the Presence app is managed and distributed by Presence
- partner services install the verifier SDK
- partner services verify signed Presence proofs on their own backend
- raw health data never enters the verifier contract

## Install status

Current status:
- source is open in this repository under MIT
- the standalone npm package is prepared and dry-run verified
- public npm publish is intentionally deferred until the adoption surface is fully finalized

Target install command after publish:

```bash
npm install @presence/verifier-sdk
```

Until then, validate the package from source:

```bash
npm --prefix packages/presence-verifier run verify:package
```

## 5-minute first success path

### 1. Install the package

```bash
npm install @presence/verifier-sdk
```

### 2. Load the packaged sandbox fixture

```js
const {
  loadPresenceSandboxFixture,
} = require('@presence/verifier-sdk/sandbox');

const fixture = await loadPresenceSandboxFixture('valid-verify-proof');
```

### 3. Create a signature verifier

```js
const {
  createStoreBackedSignatureVerifier,
} = require('@presence/verifier-sdk');

const signatureVerifier = createStoreBackedSignatureVerifier({
  resolveByIss: async ({ iss }) => {
    if (!fixture.signingSeed) {
      return null;
    }

    return iss === fixture.proof.claims.iss ? { seed: fixture.signingSeed } : null;
  },
});
```

### 4. Verify the proof

```js
const {
  assertVerifiedPresenceResult,
  verifyPresence,
} = require('@presence/verifier-sdk');

const result = await verifyPresence({
  proof: fixture.proof,
  expected: fixture.verifierInput.expected,
  signatureVerifier,
});

assertVerifiedPresenceResult(result);
console.log(result.reasonCode); // OK
```

### 5. Move to your real service flow

Replace these sandbox-only inputs:
- packaged fixture proof -> real proof sent from the Presence app flow
- sandbox signing seed -> your production issuer/key resolver
- optional in-memory replay guard -> durable Redis/DB replay protection

Keep these pieces unchanged:
- `verifyPresence(...)`
- the verifier result contract
- the privacy invariant that raw health data never reaches your service

## Copy-paste starter files

The package includes starter templates under `templates/`:
- `templates/minimal-express-server.cjs`
- `templates/verify-request.example.json`
- `templates/env.verifier.example`

These are meant to be copied into a service and adapted with real:
- issuer/key resolution
- durable replay storage
- expected request/session context lookup

## Runtime integration checklist

A production verifier service should provide:
- canonical `serviceId`
- server-issued expected context for the pending request
- durable replay protection (Redis or DB)
- issuer/key resolution by `iss`
- request/binding lookup owned by the service
- audit logging

Reference docs:
- `../../docs/spec/PRESENCE-VERIFIER-QUICKSTART.md`
- `../../docs/spec/PRESENCE-RUNTIME-INTEGRATION.md`
- `../../docs/spec/PRESENCE-VERIFIER-ROUTE-SAMPLES.md`
- `../../docs/spec/PRESENCE-VERIFIER-RELEASE-POLICY.md`

## Package verification

```bash
npm run verify:package
```

This command:
- builds the package
- verifies the root import
- verifies the sandbox subpath import
- syntax-checks the packaged starter template
- runs the packaged quickstart example
- performs `npm pack --dry-run`

## Upgrading

Planned upgrade contract:
- semver governs future public package releases
- user-facing package changes are recorded in `CHANGELOG.md`
- release/process rules live in `../../docs/spec/PRESENCE-VERIFIER-RELEASE-POLICY.md`
- protocol freeze status lives in `../../docs/spec/PRESENCE-PROTOCOL-FREEZE.md`

Before adopting a new version, re-run:

```bash
npm run verify:package
npm run compat:presence -- --report artifacts/presence-compat-report.json
```

## Privacy invariant

The verifier package only operates on:
- proof envelope
- expected verifier context
- verifier result

It does not request, accept, or persist:
- raw BPM samples
- raw step history
- HealthKit exports
- reconstructable health timelines

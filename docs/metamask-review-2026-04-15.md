# MetaMask / wallet architecture review — 2026-04-15

## Why this note exists

The wallet/session flow had repeated regressions and patch-style fixes. This document captures the grounded findings from:

- official MetaMask docs
- EIP-1193 semantics
- official/community patterns (wagmi / connector-based apps)
- independent Claude review of the current Preglyph codebase

Goal: stop symptom patching and move to a production-grade architecture.

---

## Product requirement (canonical)

User expectation:

1. Connect wallet
2. Refresh page
3. App still appears connected
4. Disconnect
5. Refresh page
6. App stays disconnected

Also:

- no long noisy "Checking..." on normal refresh
- no refresh-time errors shown to user
- desktop MetaMask extension UX should be as smooth as mainstream sites like ENS

---

## Official / canonical guidance

### 1. `eth_accounts` and `eth_requestAccounts` are different tools

Canonical split:

- `eth_accounts`
  - non-interactive
  - use for startup / restore / already-authorized check
- `eth_requestAccounts`
  - interactive
  - use only from direct user gesture

This means refresh/session restore should be handled by a restore path, not by prompting again.

### 2. Provider connectivity is not account authorization

MetaMask/EIP-1193 distinction:

- provider detected / `isConnected()` / chainId readable
  - only means provider can talk to chain
- account authorization
  - must come from `eth_accounts`, `accountsChanged`, or explicit user approval

So `provider detected` + `chainId=0x1` does **not** prove MetaMask is ready to expose accounts or handle a fresh prompt cleanly.

### 3. Injected-wallet disconnect is mostly app-local unless permission is explicitly revoked

For injected MetaMask, production apps commonly implement:

- local app disconnect / forget session
- optional stronger permission revoke only if specifically supported and explicitly requested

So the app must define disconnect semantics clearly.

### 4. Production apps use connector/session architecture

ENS-like architecture is closer to:

- connector layer (wagmi / similar)
- persisted connector/session state
- reconnect on mount
- passive authorization restore
- one interactive prompt only when needed
- public read paths independent of wallet

Not a bespoke `window.ethereum` state machine buried inside one large page component.

---

## What we learned from the bug trail

### Root cause class

The issue was not just “MetaMask is broken.”

It was a combination of:

- desktop extension readiness races after refresh
- mixing passive restore and active prompt flows
- repeatedly changing wallet state machine logic without a stable architecture
- hand-rolled provider/session logic in a monolithic page component

### Important observed pattern

Mobile often worked while desktop failed because:

- mobile MetaMask deep-link/app-browser flow behaves more like a managed session
- desktop extension depends on injected-provider timing and approval-pipeline readiness

### Anti-patterns discovered during debugging

- calling `eth_requestAccounts` too aggressively around refresh
- trying to solve UX with more retries instead of clearer state separation
- exposing connected-only UI before provider/account verification finished
- treating every `-32603` as the same transient condition

---

## Claude full-code review findings (high priority)

### P0: historical note from the old approve-flow era

This finding referred to an older runtime path that used a public approval route. The current permit-based write flow no longer relies on `/api/writers/approve` and that route has since been removed.

Historical meaning at the time:

- the product promise (“Presence-gated writing”) was not actually enforced by the shipped runtime path
- this had to be treated as a priority architectural issue

### Other major review findings

- `app/page.js` is too monolithic and brittle
- wallet/session logic is too custom and MetaMask-specific
- file-backed JSON state is not production-safe for auth/session state
- records/profile/search currently rely on non-scalable full event scans
- wallet lifecycle/browser coverage is missing

---

## Conclusion

This is **not** a case for more micro-patches.

The correct path is:

1. move toward a standard connector/session architecture
2. separate restore / verification / prompt / disconnect semantics clearly
3. keep connected-only UI behind verified wallet state
4. remove any authz bypass and make server authorization canonical

---

## Recommended next implementation order

### Phase 1 — security / architecture correctness

1. remove or hard-disable unauthenticated writer-approval bypass
2. make server-side write authorization flow canonical
3. ensure product claims match actual runtime path

### Phase 2 — wallet/session architecture

1. refactor wallet logic out of `app/page.js`
2. adopt connector-based architecture (recommended: wagmi-style model)
3. implement explicit states:
   - idle
   - restoring
   - connected-verified
   - disconnected
   - connecting
4. restore only from passive authorized-account check
5. prompt only from one user gesture path
6. app disconnect should clear local session and stay disconnected

### Phase 3 — polish / UX parity

1. minimize visible checking time
2. never show raw refresh-time wallet errors to user for normal restore
3. keep public read experience independent from wallet
4. add browser/integration tests for:
   - connect
   - refresh restore
   - disconnect persistence
   - account change
   - chain change

---

## Short takeaway

The hard part was never “connect MetaMask.”
The hard part is making wallet/session/auth flows production-grade.

Preglyph should now be treated as needing:

- wallet/session refactor
- authz hardening
- less bespoke MetaMask logic
- more canonical connector-based architecture

# Wallet Session Refactor Implementation Plan

> For Hermes: follow systematic-debugging + test-driven-development. Keep refresh restore, disconnect persistence, and MetaMask-only semantics intact.

Goal: move Preglyph wallet/session behavior out of app/page.js into connector/session modules without regressing connect, refresh restore, or disconnect behavior.

Architecture: extract pure MetaMask connector utilities, a small persisted session store, and a client hook that owns restore/connect/disconnect/event handling. Keep page-level UI, records, profile, and compose concerns in app/page.js.

Tech Stack: Next.js App Router, React client hooks, ethers, injected MetaMask provider, node:test for regression tests.

---

## Tasks

1. Add pure wallet connector/session helper modules under lib/wallet/.
2. Add failing node:test coverage for remembered-session persistence and connect/restore behavior.
3. Refactor app/page.js to consume the extracted wallet hook instead of embedding the wallet state machine.
4. Re-run tests/build, review, commit, deploy, verify.

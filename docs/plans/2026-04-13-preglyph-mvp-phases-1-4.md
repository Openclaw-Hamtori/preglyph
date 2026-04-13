# Preglyph MVP Phases 1-4 Implementation Plan

> **For Hermes:** Use subagent-driven-development if delegating any task from this plan.

**Goal:** Turn the current Preglyph visual mockup into a working MVP with wallet connect, Presence-gated write access, onchain record writing, profile/history views, and transaction search.

**Architecture:** Keep Ethereum as the source of truth for records via a minimal `PreglyphRegistry` contract. Use a small Next.js server layer for Presence sandbox verification, writer access persistence, and record indexing/search helpers. Start with a local Ethereum test chain (Hardhat) while keeping RPC/contract settings env-driven so Sepolia can be added later without a rewrite.

**Tech Stack:** Next.js App Router, React, ethers, Hardhat, local JSON persistence, Presence verifier SDK (sandbox flow for initial integration).

---

## Tasks

1. Establish contract + chain layer
   - Add a minimal Solidity contract with owner-managed writer access and onchain record storage.
   - Add Hardhat config, deploy script, and contract tests.

2. Establish app data/runtime layer
   - Add env/config helpers, JSON-backed storage helpers, Presence sandbox verifier integration, and chain access helpers.
   - Add API routes for profile status, Presence verification/granting, record listing, and tx-hash search.

3. Replace mock-only page state with real app state
   - Add wallet connect, profile drawer, search bar, About / How it works panels, and real records loading.
   - Keep the current visual language while swapping hardcoded mocks for fetched/app state.

4. Implement gated write flow
   - Add compose UI.
   - Only allow compose submission when the connected wallet has passed writer status.
   - Send write tx to the contract, show pending/confirmed states, and refresh records/profile/search data.

5. Verify end-to-end on an Ethereum test chain
   - Run contract tests.
   - Start local Hardhat chain, deploy contract, configure env, verify a sandbox Presence pass for a wallet, write a record, and confirm it appears in records/profile/search.

6. Ship cleanly
   - Run build.
   - Commit and push the full MVP.

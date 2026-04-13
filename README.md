# Preglyph

Preglyph is an onchain social MVP where only Presence-passed humans can leave short permanent public records.

This repository now includes:
- a working Next.js app shell with wallet connect, transaction search, About / How it works panels, and a profile drawer
- Presence sandbox verification that grants writer access
- an Ethereum `PreglyphRegistry` contract that stores records onchain and blocks non-approved writers
- local testchain scripts for deploy + end-to-end verification

## Stack

- Next.js App Router
- React
- ethers
- Hardhat
- Presence verifier SDK (sandbox flow)
- small canvas-based slab motion for the hero/detail view

## Local development

```bash
cd ~/Desktop/preglyph
npm install
npm run chain
npm run deploy:local
npm run dev
```

Then open:

http://127.0.0.1:3000

## Contract + testchain workflow

Run the contract tests:

```bash
npm run test:contracts
```

Deploy to the local Ethereum testchain and write `.env.local` automatically:

```bash
npm run deploy:local
```

Run the end-to-end local verification flow:

```bash
npm run test:e2e:local
```

That script verifies a Presence sandbox proof, grants writer access onchain, writes a record, and confirms the emitted transaction.

## Production build

```bash
npm run build
npm run start
```

## Optional Sepolia setup

Set these env vars if you want to move from the local testchain to Sepolia later:

```bash
SEPOLIA_RPC_URL=...
PRIVATE_KEY=...
```

The contract/runtime env keys used by the app are documented in `.env.example`.

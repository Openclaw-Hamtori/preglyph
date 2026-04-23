# Preglyph Ethereum Mainnet + $1 ETH Fee Implementation Plan

> For Hermes: execute in tiny verified steps. Keep unrelated UI/layout untouched.

Goal: move Preglyph from Sepolia to Ethereum mainnet and require an approximately $1 ETH payment for each successful Preglyph write.

Architecture: keep the existing server-signed write-permit model, but extend the signed payload to include a fee quote in wei and a short quote expiry. The contract becomes payable, enforces an exact fee amount from the permit, and forwards collected ETH to a configured treasury address. Mainnet cutover remains an env/config/deploy operation once the new contract and client are ready.

Tech Stack: Next.js 15, ethers v6, Hardhat, Solidity 0.8.24, MetaMask, Ethereum mainnet, server-side fee quoting.

Current code facts:
- `contracts/PreglyphRegistry.sol` is not payable yet.
- `app/page.js` calls `contract.writeRecord(...)` with no `value`.
- `app/api/write/permit/route.js` signs only content/author permit data.
- `hardhat.config.js` only defines `hardhat`, `localhost`, and `sepolia`.
- Mainnet cutover therefore requires both contract changes and config/deploy changes.
- Fee policy decision is now locked: use a real-time server-side ETH/USD quote with a short TTL, then bind the exact `feeWei` into the write permit.

Important product decision assumed by this plan:
- default interpretation = charge about $1 worth of ETH per write, not a one-time wallet signup fee.
- if the product meaning is actually “one-time per wallet registration,” reuse most of this plan but move payment enforcement to a separate registration state path.

---

## Treasury / fee destination decision (must be fixed before implementation)

Before coding, decide where each paid write fee goes.

Recommended options:

### Option A — Your personal treasury wallet (best default)
- Destination: one Ethereum mainnet EOA you control
- Pros:
  - simplest
  - no extra custody contract
  - easiest accounting early on
- Cons:
  - less separation between product revenue and personal wallet ops

### Option B — Dedicated Preglyph treasury wallet (recommended if you want cleaner ops)
- Destination: one separate Ethereum mainnet EOA used only for Preglyph revenue
- Pros:
  - cleaner bookkeeping
  - easier later migration into company/multisig structure
  - lower accidental operational risk
- Cons:
  - one more wallet to manage securely

### Option C — Multisig treasury (best governance, more overhead)
- Destination: Safe/multisig wallet
- Pros:
  - strongest treasury hygiene
  - better if multiple operators or future legal entity
- Cons:
  - slower operationally
  - overkill for very early solo stage

Recommended default for current stage:
- use the existing Safe as the Preglyph treasury
- keep permit signer separate from the Safe if possible
- forward each write fee to the Safe immediately

Decision now locked for this project:
- `PREGLYPH_FEE_TREASURY_ADDRESS` = `0x3B0Bca0c5921c9F416093DCa8D7713b2508ad49A` (user's existing Safe)
- treasury type = Safe / multisig
- permit signer should stay separate from treasury if possible
- fees should be immediately forwarded on each write

Suggested operating rule:
- permit signer wallet != treasury wallet
- deployer can be same as permit signer at first, but treasury should ideally be separate

---

## Task 1: Add authoritative fee config surface

Objective: create one shared place for fee-related runtime config so contract deployment, permit signing, and UI all read the same values.

Files:
- Modify: `lib/config.js`
- Create: `lib/write-fee.mjs`
- Test: `tests/wallet/write-fee-config.test.mjs`

Steps:
1. Add failing unit tests for config parsing:
   - treasury address required when fee is enabled
   - quote ttl defaults sanely
   - public runtime exposes human-readable fee mode only, not secrets
2. Create `lib/write-fee.mjs` with helpers such as:
   - `DEFAULT_FEE_QUOTE_TTL_SECONDS`
   - `parseUsdCents(raw)`
   - `isFeeEnabled(config)`
3. Extend `lib/config.js` server runtime with:
   - `feeTreasuryAddress`
   - `feeUsdCents`
   - `feeQuoteTtlSeconds`
   - `mainnetRpcUrl` if needed separately later
4. Extend `getPublicRuntimeConfig()` with only safe UI fields:
   - `feeEnabled`
   - `feeDisplayUsd`
5. Run:
   - `npm run test:unit`

Suggested env keys:
- `PREGLYPH_FEE_USD_CENTS=100`
- `PREGLYPH_FEE_TREASURY_ADDRESS=0x...`
- `PREGLYPH_FEE_QUOTE_TTL_SECONDS=300`

---

## Task 2: Make the contract payable and fee-enforcing

Objective: require the exact fee in wei for each write and forward it to treasury.

Files:
- Modify: `contracts/PreglyphRegistry.sol`
- Modify: `lib/preglyphAbi.cjs`
- Test: `test/PreglyphRegistry.js`

Contract design:
- Constructor should accept:
  - `address signer_`
  - `address treasury_`
- Add immutable treasury address.
- Add custom errors:
  - `InvalidTreasury()`
  - `IncorrectWriteFee()`
  - `FeeTransferFailed()`
- Extend `writeRecord` signature to include `uint256 feeWei`.
- Permit digest must include `feeWei` so the server-signed quote cannot be swapped.
- Function becomes `payable` and requires `msg.value == feeWei`.
- After permit verification and before/after state update, forward ETH to treasury with low-level call.

Test cases to add:
1. valid write succeeds when `msg.value === feeWei`
2. write reverts when `msg.value` is zero or mismatched
3. permit signed for one fee cannot be replayed with another fee
4. treasury receives funds
5. zero treasury constructor arg reverts
6. existing content-length and permit replay tests still pass

Run:
- `npx hardhat test test/PreglyphRegistry.js`

---

## Task 3: Extend permit signing to bind the fee quote

Objective: the backend-signed permit must bind fee wei, chain, contract, author, content, expiry, and nonce together.

Files:
- Modify: `lib/write-permit.mjs`
- Modify: `tests/wallet/write-permit.test.mjs`
- Modify: `app/api/write/permit/route.js`
- Create: `tests/wallet/write-fee-quote.test.mjs`

Steps:
1. Update `buildWritePermitDigest()` and `signWritePermit()` to include `feeWei`.
2. Add route response payload shape:
   - `permit.expiresAt`
   - `permit.nonce`
   - `permit.signature`
   - `permit.feeWei`
   - optional `permit.feeUsdCents`
3. Keep wallet auth proof logic unchanged, but make the route reject fee-enabled mode if treasury config is missing.
4. Add unit tests covering:
   - different feeWei => different permit digest
   - permit route returns feeWei when fee is enabled
   - route fails loudly when fee config is incomplete

Run:
- `npm run test:unit`

---

## Task 4: Implement server-side $1 quote calculation

Objective: convert the configured USD amount into wei at permit-issuance time.

Files:
- Create: `lib/eth-usd-quote.mjs`
- Modify: `app/api/write/permit/route.js`
- Test: `tests/wallet/eth-usd-quote.test.mjs`

Recommended default implementation:
- Use a server-side ETH/USD price source.
- Convert `100` cents into wei with a conservative round-up so underpayment never slips through.
- Bind the exact `feeWei` into the signed permit.

Recommended production path:
- primary: Chainlink mainnet ETH/USD feed, read server-side over JSON-RPC
- fallback during development/emergency: fixed env override like `PREGLYPH_FEE_OVERRIDE_WEI`

Decision now locked for this project:
- use Chainlink ETH/USD as the canonical price source for $1 fee quoting
- server reads the feed and computes `feeWei`
- quote is short-lived and bound into the write permit

Important rule:
- do not have the client calculate the fee independently; the client should only display and pay the server-quoted wei amount.

Tests:
1. cents + price => expected wei conversion
2. rounds up, not down
3. explicit override bypasses live quoting in tests/dev

Run:
- `npm run test:unit`

---

## Task 5: Update the compose flow to send ETH with the write

Objective: the wallet transaction must include the quoted wei value and explain the fee clearly in UI text.

Files:
- Modify: `app/page.js`
- Modify: `app/globals.css` only if a tiny fee label is needed
- Test: `tests/wallet/write-modal.test.mjs`

Steps:
1. In the existing `/api/write/permit` call path, read `permit.feeWei`.
2. Call:
   - `contract.writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei })`
   depending on the ABI ordering you finalize.
3. Add a small exact UI notice in the write panel, for example:
   - `Publishing this Preglyph costs about $1 in ETH.`
4. After quote arrives, optionally show the exact ETH amount before final wallet confirmation.
5. Keep all existing session-change guards intact.

Tests:
- clamp/length tests remain unchanged
- add a focused unit test for any helper that formats fee display if you create one

Manual verify:
- MetaMask confirmation shows a non-zero value
- successful write still lands in `/api/records`

---

## Task 6: Add Ethereum mainnet network support

Objective: make deployment and client chain switching support mainnet cleanly.

Files:
- Modify: `hardhat.config.js`
- Modify: `scripts/deploy-sepolia.js` or split into shared deploy + `deploy-mainnet.js`
- Modify: `lib/config.js`
- Modify: any env templates / deployment notes

Steps:
1. Add `mainnet` network to Hardhat using:
   - `MAINNET_RPC_URL`
   - deployer key
   - `chainId: 1`
2. Create `scripts/deploy-mainnet.js` or a shared deploy script parameterized by network.
3. Ensure runtime chain metadata can display:
   - chain name `Ethereum`
   - explorer `https://etherscan.io/tx/`
4. Preserve legacy contract support so Sepolia history is not mixed into mainnet archive views unless intentionally migrated.

Likely env additions:
- `MAINNET_RPC_URL=`
- `PREGLYPH_CHAIN_ID=1`
- `NEXT_PUBLIC_PREGLYPH_CHAIN_ID=1`
- `NEXT_PUBLIC_PREGLYPH_CHAIN_NAME=Ethereum`
- `NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL=https://etherscan.io/tx/`

---

## Task 7: Add deployment safety notes and live-cutover checklist

Objective: make the irreversible mainnet cutover repeatable and safe.

Files:
- Create: `docs/plans/mainnet-cutover-checklist.md` or extend this plan later
- Modify: deployment runbook if one exists

Checklist must include:
1. do not ask the user to paste private keys in chat
2. derive deployer address locally and verify ETH balance first
3. deploy contract to mainnet
4. save deployed block and contract address
5. update live env on VPS
6. back up `.env.local` before replacing values
7. rebuild and restart only `preglyph.service`
8. confirm `/rpc` reports `0x1`
9. confirm `/api/records` works
10. do one real paid write end-to-end
11. verify treasury received the payment
12. hard-refresh browser after deploy to avoid stale bundle/address mismatch

---

## Task 8: Verification pass before live mainnet deploy

Objective: prove the code is correct before touching mainnet.

Files:
- none new beyond tests above

Run in repo root:
- `npm run test:unit`
- `npx hardhat test test/PreglyphRegistry.js`
- `npm run build`

Manual local/sepolia smoke before mainnet:
1. deploy the new fee-enabled contract to Sepolia first
2. verify one successful paid write with tiny real ETH
3. verify underpayment revert path
4. verify permit replay still fails
5. verify exact 100-char Korean write still succeeds

Only after that do the mainnet deploy.

---

## Task 9: Live mainnet cutover

Objective: switch the live app from Sepolia to Ethereum mainnet.

Files:
- remote `.env.local`
- possibly Caddy `/rpc` upstream if you keep exposing it

Expected live env values:
- `PREGLYPH_RPC_URL=<mainnet rpc>`
- `PREGLYPH_CHAIN_ID=1`
- `NEXT_PUBLIC_PREGLYPH_CHAIN_ID=1`
- `PREGLYPH_CONTRACT_ADDRESS=<mainnet contract>`
- `NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS=<mainnet contract>`
- `PREGLYPH_DEPLOY_BLOCK=<mainnet deploy block>`
- `PREGLYPH_ADMIN_PRIVATE_KEY=<permit signer key>`
- `PREGLYPH_FEE_USD_CENTS=100`
- `PREGLYPH_FEE_TREASURY_ADDRESS=<your treasury>`
- `NEXT_PUBLIC_PREGLYPH_CHAIN_NAME=Ethereum`
- `NEXT_PUBLIC_PREGLYPH_EXPLORER_BASE_URL=https://etherscan.io/tx/`

Verification after deploy:
- `/rpc` => `0x1`
- homepage loads
- write modal says fee applies
- MetaMask prompts for non-zero ETH value
- one live write succeeds
- treasury wallet balance increases by quoted fee amount

---

## Implementation order recommendation

1. fee config
2. contract payable fee enforcement
3. permit digest + route fee binding
4. quote calculation
5. client value send + fee copy
6. sepolia paid smoke test
7. mainnet deploy support
8. live mainnet cutover

## Commit recommendation

Use tiny commits, e.g.:
- `feat: add preglyph write fee config helpers`
- `feat: enforce payable write fee in registry`
- `feat: bind fee quote into write permits`
- `feat: send quoted eth value with preglyph writes`
- `feat: add ethereum mainnet deploy support`
- `docs: add preglyph mainnet cutover checklist`

## Main risk to avoid

Do not ship a client-side-calculated `$1` fee. The server must quote the wei amount and bind it into the signed permit; otherwise users can underpay or race stale prices.

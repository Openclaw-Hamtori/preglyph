# Preglyph wagmi wallet migration plan

> For Hermes: execute this as a root-cause-first, canonical architecture migration. No more bespoke MetaMask session patches.

Goal: replace the custom MetaMask restore/connect state machine with a wagmi-based MetaMask-only connector flow that supports connect, refresh restore, local disconnect persistence, and existing write/profile gating.

Architecture:
- Add a client-side Wagmi provider at the app root using a MetaMask-only injected connector.
- Replace `useMetaMaskSession` internals with wagmi account/connect/disconnect/watch state, while preserving the existing debug surface and app-level local disconnect semantics.
- Keep write-onchain flow on ethers for now, but source the wallet provider/signer from the wagmi connector transport instead of a bespoke restore loop.

Planned tasks:
1. Inspect current wallet integration and add wagmi/react-query dependencies.
2. Add a small tested wallet-session utility module for canonical local disconnect / reconnect gating semantics.
3. Add app-level Wagmi provider wiring.
4. Rebuild `useMetaMaskSession` on top of wagmi hooks + watchers.
5. Update `app/page.js` write/connect paths to use the wagmi-backed session.
6. Run unit tests/build, independent review, commit/push/deploy.

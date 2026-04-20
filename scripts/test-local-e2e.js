require('dotenv').config({ path: '.env.local' });

const path = require('node:path');
const { Wallet, JsonRpcProvider, Contract, Interface, NonceManager, parseEther } = require('ethers');
const {
  createStoreBackedSignatureVerifier,
  verifyPresence,
} = require('@presence/verifier-sdk');
const {
  loadPresenceSandboxFixture,
} = require('@presence/verifier-sdk/sandbox');
const PREGlyph_ABI = require('../lib/preglyphAbi.cjs');

const FIXTURES_DIR = path.resolve(
  process.cwd(),
  'vendor/presence-verifier/fixtures/presence-sandbox',
);

async function main() {
  const rpcUrl = process.env.PREGLYPH_RPC_URL;
  const contractAddress = process.env.PREGLYPH_CONTRACT_ADDRESS;
  const adminPrivateKey = process.env.PREGLYPH_ADMIN_PRIVATE_KEY;

  if (!rpcUrl || !contractAddress || !adminPrivateKey) {
    throw new Error('Missing local chain env. Run npm run deploy:local first.');
  }

  const fixture = await loadPresenceSandboxFixture('valid-verify-proof', FIXTURES_DIR);
  const signatureVerifier = createStoreBackedSignatureVerifier({
    resolveByIss: async ({ iss }) => {
      if (!fixture.signingSeed) return null;
      return iss === fixture.proof.claims.iss ? { seed: fixture.signingSeed } : null;
    },
  });

  const verification = await verifyPresence({
    proof: fixture.proof,
    expected: {
      protocolVersion: 'v0',
      serviceId: process.env.PREGLYPH_PRESENCE_SERVICE_ID || 'noctu',
      flowType: process.env.PREGLYPH_PRESENCE_FLOW_TYPE || 'verify',
      sessionId: fixture.verifierInput.expected.sessionId,
      sessionHandle: fixture.verifierInput.expected.sessionHandle,
      expectedNonce: fixture.proof.claims.nonce,
      submitTarget: {
        endpoint_ref: process.env.PREGLYPH_PRESENCE_ENDPOINT_REF || 'verify-proof',
        auth_context: process.env.PREGLYPH_PRESENCE_AUTH_CONTEXT || 'service-auth-context',
      },
      sessionExpiresAtMs: fixture.verifierInput.expected.sessionExpiresAtMs,
    },
    signatureVerifier,
  });

  if (!verification.ok) {
    throw new Error(`Presence sandbox verification failed: ${verification.reasonCode}`);
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const adminWallet = new NonceManager(new Wallet(adminPrivateKey, provider));
  const userWallet = Wallet.createRandom().connect(provider);
  const fundingTx = await adminWallet.sendTransaction({ to: userWallet.address, value: parseEther('1') });
  await fundingTx.wait();
  const adminContract = new Contract(contractAddress, PREGlyph_ABI, adminWallet);
  const userContract = new Contract(contractAddress, PREGlyph_ABI, userWallet);

  const grantTx = await adminContract.setWriterApproval(userWallet.address, true);
  await grantTx.wait();

  const writeTx = await userContract.writeRecord('Preglyph local testchain write: passed humans can now leave durable public records.');
  const receipt = await writeTx.wait();

  const iface = new Interface(PREGlyph_ABI);
  const parsed = receipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((entry) => entry && entry.name === 'RecordWritten');

  if (!parsed) {
    throw new Error('RecordWritten event was not found.');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        writer: userWallet.address,
        verificationReason: verification.reasonCode,
        claimTxHash: grantTx.hash,
        recordTxHash: receipt.hash,
        recordId: Number(parsed.args.recordId),
        content: parsed.args.content,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

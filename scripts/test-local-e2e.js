require('dotenv').config({ path: '.env.local' });

const { Wallet, JsonRpcProvider, Contract, Interface, NonceManager, parseEther } = require('ethers');
const PREGlyph_ABI = require('../lib/preglyphAbi.cjs');

async function main() {
  const rpcUrl = process.env.PREGLYPH_RPC_URL;
  const contractAddress = process.env.PREGLYPH_CONTRACT_ADDRESS;
  const adminPrivateKey = process.env.PREGLYPH_ADMIN_PRIVATE_KEY;

  if (!rpcUrl || !contractAddress || !adminPrivateKey) {
    throw new Error('Missing local chain env. Run npm run deploy:local first.');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const adminWallet = new NonceManager(new Wallet(adminPrivateKey, provider));
  const userWallet = Wallet.createRandom().connect(provider);
  const fundingTx = await adminWallet.sendTransaction({ to: userWallet.address, value: parseEther('1') });
  await fundingTx.wait();
  const userContract = new Contract(contractAddress, PREGlyph_ABI, userWallet);

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

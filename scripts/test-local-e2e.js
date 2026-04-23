const { readFileSync } = require('node:fs');
const { Contract, Interface, JsonRpcProvider, NonceManager, Wallet, ethers, parseEther, randomBytes, solidityPackedKeccak256, toUtf8Bytes } = require('ethers');
const PREGlyph_ABI = require('../lib/preglyphAbi.cjs');

function buildPermitDigest({ contractAddress, chainId, author, content, expiresAt, nonce }) {
  return solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint256', 'bytes32'],
    [contractAddress, chainId, author, ethers.keccak256(toUtf8Bytes(content)), expiresAt, nonce],
  );
}

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

  const chainId = Number((await provider.getNetwork()).chainId);
  const content = 'Preglyph local testchain write: passed humans can now leave durable public records.';
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const nonce = `0x${Buffer.from(randomBytes(32)).toString('hex')}`;
  const digest = buildPermitDigest({ contractAddress, chainId, author: userWallet.address, content, expiresAt, nonce });
  const signature = await adminWallet.signMessage(ethers.getBytes(digest));

  const writeTx = await userContract.writeRecord(content, BigInt(expiresAt), nonce, signature);
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
        txHash: receipt.hash,
        recordId: parsed.args.recordId.toString(),
        author: parsed.args.author,
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

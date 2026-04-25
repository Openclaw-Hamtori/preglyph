const { Contract, Interface, JsonRpcProvider, NonceManager, Wallet, ethers, parseEther, randomBytes, solidityPackedKeccak256, toUtf8Bytes } = require('ethers');
const PREGlyph_ABI = require('../lib/preglyphAbi.cjs');

function buildPermitDigest({ contractAddress, chainId, author, content, inscriptionMode = 0, expiresAt, nonce, feeWei }) {
  return solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint8', 'uint256', 'bytes32', 'uint256'],
    [contractAddress, chainId, author, ethers.keccak256(toUtf8Bytes(content)), inscriptionMode, expiresAt, nonce, feeWei],
  );
}

async function main() {
  const rpcUrl = process.env.PREGLYPH_RPC_URL;
  const contractAddress = process.env.PREGLYPH_CONTRACT_ADDRESS;
  const adminPrivateKey = process.env.PREGLYPH_ADMIN_PRIVATE_KEY;
  const feeOverrideWei = process.env.PREGLYPH_FEE_OVERRIDE_WEI || '500000000000000';

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
  const feeWei = BigInt(feeOverrideWei);
  const digest = buildPermitDigest({ contractAddress, chainId, author: userWallet.address, content, inscriptionMode: 0, expiresAt, nonce, feeWei });
  const signature = await adminWallet.signMessage(ethers.getBytes(digest));

  const writeTx = await userContract.writeRecord(content, 0, BigInt(expiresAt), nonce, feeWei, signature, { value: feeWei });
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
        feeWei: feeWei.toString(),
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

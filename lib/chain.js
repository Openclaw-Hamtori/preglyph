import { Contract, JsonRpcProvider, Wallet, Interface, formatEther, isAddress } from 'ethers';
import PREGlyph_ABI from './preglyphAbi.cjs';
import { assertContractConfigured, getPublicRuntimeConfig, getServerRuntimeConfig } from './config';

const recordInterface = new Interface(PREGlyph_ABI);
const RECORD_EVENT = 'RecordWritten';

let cachedProvider;

function getProvider() {
  if (!cachedProvider) {
    const { rpcUrl } = getServerRuntimeConfig();
    cachedProvider = new JsonRpcProvider(rpcUrl);
  }
  return cachedProvider;
}

export function getContractInterface() {
  return recordInterface;
}

export function getReadContract() {
  const { contractAddress } = assertContractConfigured();
  return new Contract(contractAddress, PREGlyph_ABI, getProvider());
}

export function getAdminContract() {
  const { contractAddress, adminPrivateKey } = assertContractConfigured();
  if (!adminPrivateKey) {
    throw new Error('Missing PREGLYPH_ADMIN_PRIVATE_KEY.');
  }
  const wallet = new Wallet(adminPrivateKey, getProvider());
  return new Contract(contractAddress, PREGlyph_ABI, wallet);
}

function toRecordFromLog(log) {
  const parsed = recordInterface.parseLog(log);
  if (!parsed || parsed.name !== RECORD_EVENT) return null;

  const [recordId, author, content, createdAt] = parsed.args;
  return {
    id: Number(recordId),
    author,
    content,
    createdAt: Number(createdAt),
    txHash: log.transactionHash,
  };
}

export async function ensureWriterApproval(address, approved = true) {
  if (!isAddress(address)) {
    throw new Error('Invalid wallet address.');
  }
  const contract = getAdminContract();
  const alreadyApproved = await contract.approvedWriters(address);
  if (Boolean(alreadyApproved) === Boolean(approved)) {
    return { skipped: true, approved: Boolean(alreadyApproved) };
  }
  const tx = await contract.setWriterApproval(address, approved);
  const receipt = await tx.wait();
  return {
    skipped: false,
    txHash: receipt.hash,
    approved,
  };
}

export async function getRecords({ author } = {}) {
  const contract = getReadContract();
  const filter = contract.filters.RecordWritten(null, author || null);
  const logs = await contract.queryFilter(filter, 0, 'latest');
  return logs
    .map((log) => toRecordFromLog(log))
    .filter(Boolean)
    .sort((a, b) => b.id - a.id);
}

export async function getRecordByTxHash(txHash) {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return null;

  for (const log of receipt.logs) {
    try {
      const record = toRecordFromLog(log);
      if (record) return record;
    } catch {
      // ignore unrelated logs
    }
  }
  return null;
}

export async function getOnchainWriterStatus(address) {
  if (!address || !isAddress(address)) return false;
  const contract = getReadContract();
  return Boolean(await contract.approvedWriters(address));
}

export function getClientChainConfig() {
  return getPublicRuntimeConfig();
}

export async function getNetworkSummary() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  const balance = await provider.getBalance(assertContractConfigured().contractAddress);

  return {
    chainId: Number(network.chainId),
    blockNumber,
    contractBalanceEth: formatEther(balance),
  };
}

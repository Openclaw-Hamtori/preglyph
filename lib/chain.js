import { Contract, JsonRpcProvider, Interface, formatEther, isAddress } from 'ethers';
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

function getReadContract(addressOverride) {
  const { contractAddress } = assertContractConfigured();
  return new Contract(addressOverride || contractAddress, PREGlyph_ABI, getProvider());
}

function getRecordContracts() {
  const { contractAddress, deployBlock, legacyContracts = [] } = assertContractConfigured();
  return [
    { address: contractAddress, deployBlock: Number(deployBlock) || 0 },
    ...legacyContracts,
  ].filter((entry) => entry.address);
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
    contractAddress: log.address,
  };
}

export async function ensureWriterApproval(address, approved = true) {
  if (!isAddress(address)) {
    throw new Error('Invalid wallet address.');
  }
  return {
    skipped: true,
    approved: Boolean(approved),
    address,
  };
}

export async function getRecords({ author } = {}) {
  const provider = getProvider();
  const latestBlock = await provider.getBlockNumber();
  const chunkSize = 40000;
  const allLogs = [];

  for (const descriptor of getRecordContracts()) {
    const contract = getReadContract(descriptor.address);
    const fromBlock = Math.max(0, Number(descriptor.deployBlock) || 0);

    for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, latestBlock);
      const filter = contract.filters.RecordWritten(null, author || null);
      const logs = await contract.queryFilter(filter, start, end);
      allLogs.push(...logs);
    }
  }

  return allLogs
    .map((log) => toRecordFromLog(log))
    .filter(Boolean)
    .sort((a, b) => (b.createdAt - a.createdAt) || (b.id - a.id));
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
  return true;
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

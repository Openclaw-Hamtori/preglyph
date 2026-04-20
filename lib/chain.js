import { Contract, JsonRpcProvider, Wallet, Interface, formatEther } from 'ethers';
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

export async function getRecords({ author } = {}) {
  const contract = getReadContract();
  const provider = getProvider();
  const { deployBlock = 0 } = getServerRuntimeConfig();
  const latestBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, Number(deployBlock) || 0);
  const chunkSize = 40000;
  const allLogs = [];

  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);
    const filter = contract.filters.RecordWritten(null, author || null);
    const logs = await contract.queryFilter(filter, start, end);
    allLogs.push(...logs);
  }

  return allLogs
    .flatMap((log) => {
      try {
        const record = toRecordFromLog(log);
        return record ? [record] : [];
      } catch {
        return [];
      }
    })
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

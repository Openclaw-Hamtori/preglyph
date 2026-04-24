import { Contract, JsonRpcProvider, Interface, formatEther } from 'ethers';
import PREGlyph_ABI from './preglyphAbi.cjs';
import {
  INITIAL_RECORDS_LIMIT,
  encodeRecordsCursor,
  paginateOrderedRecords,
} from './records-pagination.mjs';
import { pickAllowedRecordFromLogs } from './record-log-filter.mjs';
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
    blockNumber: Number(log.blockNumber || 0),
    logIndex: Number(log.index ?? log.logIndex ?? 0),
  };
}

async function queryRecordLogsInRange({ author, startBlock, endBlock }) {
  const allLogs = [];
  for (const descriptor of getRecordContracts()) {
    const contract = getReadContract(descriptor.address);
    const fromBlock = Math.max(Number(descriptor.deployBlock) || 0, startBlock);
    if (fromBlock > endBlock) continue;
    const filter = contract.filters.RecordWritten(null, author || null);
    const logs = await contract.queryFilter(filter, fromBlock, endBlock);
    allLogs.push(...logs);
  }
  return allLogs;
}

export async function getRecords({ author } = {}) {
  const provider = getProvider();
  const latestBlock = await provider.getBlockNumber();
  const chunkSize = 40000;
  const allLogs = [];

  for (let start = 0; start <= latestBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latestBlock);
    const logs = await queryRecordLogsInRange({ author, startBlock: start, endBlock: end });
    allLogs.push(...logs);
  }

  return allLogs
    .map((log) => toRecordFromLog(log))
    .filter(Boolean)
    .sort((a, b) => (b.blockNumber - a.blockNumber) || (b.logIndex - a.logIndex));
}

export async function getRecordsPage({ author, limit = INITIAL_RECORDS_LIMIT, cursor = null } = {}) {
  const provider = getProvider();
  const latestBlock = await provider.getBlockNumber();
  const chunkSize = 40000;
  const records = [];
  const startFromBlock = cursor?.blockNumber ?? latestBlock;
  const minimumDeployBlock = Math.min(...getRecordContracts().map((entry) => Number(entry.deployBlock) || 0));

  for (let endBlock = startFromBlock; endBlock >= minimumDeployBlock; endBlock -= chunkSize) {
    const startBlock = Math.max(minimumDeployBlock, endBlock - chunkSize + 1);
    const logs = await queryRecordLogsInRange({ author, startBlock, endBlock });
    const page = paginateOrderedRecords(
      logs.map((log) => toRecordFromLog(log)).filter(Boolean),
      { limit: limit + 1, cursor },
    );
    records.push(...page.records);
    if (records.length > limit) break;
    if (startBlock === minimumDeployBlock) break;
  }

  const finalPage = paginateOrderedRecords(records, { limit, cursor: null });
  return finalPage;
}

export async function getRecordTotalCount() {
  const totals = await Promise.all(
    getRecordContracts().map(async (descriptor) => {
      const contract = getReadContract(descriptor.address);
      return Number(await contract.recordCount());
    })
  );
  return totals.reduce((sum, value) => sum + value, 0);
}

export async function getRecordByTxHash(txHash) {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return null;

  return pickAllowedRecordFromLogs({
    logs: receipt.logs,
    allowedContracts: getRecordContracts(),
    recordInterface,
  });
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

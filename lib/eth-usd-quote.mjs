import { Contract } from 'ethers';
import { getSharedRpcProvider } from './rpc-provider.mjs';

export const DEFAULT_FEE_QUOTE_TTL_SECONDS = 300;
export const DEFAULT_CHAINLINK_ETH_USD_FEED = '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419';
export const SEPOLIA_CHAINLINK_ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
export const BASE_CHAINLINK_ETH_USD_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';

const CHAINLINK_AGGREGATOR_V3_ABI = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
];

export function assertChainlinkRoundComplete({ roundId, answeredInRound }) {
  const normalizedRoundId = BigInt(roundId || 0);
  const normalizedAnsweredInRound = BigInt(answeredInRound || 0);
  if (normalizedRoundId <= 0n || normalizedAnsweredInRound < normalizedRoundId) {
    throw new Error('Chainlink ETH/USD feed returned an incomplete round.');
  }
}

export function parseChainlinkAnswerToPrice({ answer, decimals }) {
  const normalizedAnswer = typeof answer === 'bigint' ? Number(answer) : Number(answer || 0);
  const normalizedDecimals = Number(decimals || 0);
  if (!Number.isFinite(normalizedAnswer) || normalizedAnswer <= 0) {
    throw new Error('Chainlink answer must be a positive number.');
  }
  return normalizedAnswer / (10 ** normalizedDecimals);
}

export function convertUsdCentsToWei({ usdCents, ethUsdPrice }) {
  const normalizedUsdCents = Number(usdCents || 0);
  if (!Number.isFinite(normalizedUsdCents) || normalizedUsdCents <= 0) {
    throw new Error('USD cents must be a positive number.');
  }

  const priceText = String(ethUsdPrice || '').trim();
  const match = priceText.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error('ETH/USD price must be a positive number.');
  }

  const integerPart = match[1];
  const fractionalPart = match[2] || '';
  const scale = 10n ** BigInt(fractionalPart.length);
  const scaledPrice = BigInt(integerPart + fractionalPart);
  if (scaledPrice <= 0n) {
    throw new Error('ETH/USD price must be a positive number.');
  }

  const numerator = BigInt(normalizedUsdCents) * (10n ** 18n) * scale;
  const denominator = 100n * scaledPrice;
  return (numerator + denominator - 1n) / denominator;
}

export function resolveChainlinkFeedAddress(feedAddress, chainId = 1) {
  const normalizedFeedAddress = String(feedAddress || '').trim();
  if (normalizedFeedAddress) {
    return normalizedFeedAddress;
  }

  if (Number(chainId) === 11155111) {
    return SEPOLIA_CHAINLINK_ETH_USD_FEED;
  }

  if (Number(chainId) === 8453) {
    return BASE_CHAINLINK_ETH_USD_FEED;
  }

  return DEFAULT_CHAINLINK_ETH_USD_FEED;
}

export function assertChainlinkPriceFresh({ updatedAt, now = Math.floor(Date.now() / 1000), maxAgeSeconds = DEFAULT_FEE_QUOTE_TTL_SECONDS }) {
  const normalizedUpdatedAt = Number(updatedAt || 0);
  const normalizedNow = Number(now || 0);
  const normalizedMaxAge = Number(maxAgeSeconds || DEFAULT_FEE_QUOTE_TTL_SECONDS);
  if (!Number.isFinite(normalizedUpdatedAt) || normalizedUpdatedAt <= 0) {
    throw new Error('Chainlink ETH/USD feed returned an invalid timestamp.');
  }
  if (normalizedUpdatedAt + normalizedMaxAge < normalizedNow) {
    throw new Error('Chainlink ETH/USD feed is stale.');
  }
}

export async function fetchChainlinkEthUsdPrice({ rpcUrl, feedAddress = DEFAULT_CHAINLINK_ETH_USD_FEED, chainId = 1, maxAgeSeconds = DEFAULT_FEE_QUOTE_TTL_SECONDS }) {
  if (!rpcUrl) {
    throw new Error('RPC URL is required to fetch the Chainlink ETH/USD price.');
  }

  const provider = getSharedRpcProvider(rpcUrl);
  const feed = new Contract(resolveChainlinkFeedAddress(feedAddress, chainId), CHAINLINK_AGGREGATOR_V3_ABI, provider);
  const [decimals, roundData] = await Promise.all([
    feed.decimals(),
    feed.latestRoundData(),
  ]);
  const answer = roundData?.answer;
  const updatedAt = Number(roundData?.updatedAt || 0);
  const roundId = roundData?.roundId;
  const answeredInRound = roundData?.answeredInRound;
  if (typeof answer !== 'bigint' && typeof answer !== 'number') {
    throw new Error('Chainlink ETH/USD feed returned no answer.');
  }
  if (BigInt(answer) <= 0n) {
    throw new Error('Chainlink ETH/USD feed returned a non-positive answer.');
  }
  assertChainlinkRoundComplete({ roundId, answeredInRound });
  assertChainlinkPriceFresh({ updatedAt, maxAgeSeconds });
  return {
    ethUsdPrice: parseChainlinkAnswerToPrice({ answer, decimals }),
    updatedAt,
    decimals: Number(decimals),
    answer: BigInt(answer),
    feedAddress: resolveChainlinkFeedAddress(feedAddress, chainId),
  };
}

export async function getWriteFeeQuote({ rpcUrl, usdCents, overrideWei = '', feedAddress = DEFAULT_CHAINLINK_ETH_USD_FEED, chainId = 1, maxAgeSeconds = DEFAULT_FEE_QUOTE_TTL_SECONDS }) {
  if (overrideWei) {
    return {
      feeWei: BigInt(overrideWei),
      source: 'override',
      feedAddress: resolveChainlinkFeedAddress(feedAddress, chainId),
      ethUsdPrice: null,
      updatedAt: 0,
    };
  }

  const price = await fetchChainlinkEthUsdPrice({ rpcUrl, feedAddress, chainId, maxAgeSeconds });
  return {
    feeWei: convertUsdCentsToWei({ usdCents, ethUsdPrice: price.ethUsdPrice }),
    source: 'chainlink',
    feedAddress: price.feedAddress,
    ethUsdPrice: price.ethUsdPrice,
    updatedAt: price.updatedAt,
  };
}

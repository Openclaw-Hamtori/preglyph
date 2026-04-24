import { getWriteFeeQuote, isChainlinkPriceStaleError } from './eth-usd-quote.mjs';

export async function resolvePermitFeeQuote(options, { getQuote = getWriteFeeQuote } = {}) {
  try {
    return await getQuote(options);
  } catch (error) {
    if (!isChainlinkPriceStaleError(error)) {
      throw error;
    }

    const fallbackQuote = await getQuote({
      ...options,
      allowStale: true,
    });

    return {
      ...fallbackQuote,
      source: fallbackQuote.source === 'chainlink-stale' ? 'chainlink-stale-fallback' : fallbackQuote.source,
      stale: true,
    };
  }
}

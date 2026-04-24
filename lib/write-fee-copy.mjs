export function getWriteFeeNotice(feeDisplayUsd) {
  const normalizedFeeDisplayUsd = String(feeDisplayUsd || '').trim();
  if (!normalizedFeeDisplayUsd) {
    return 'Each Preglyph costs about $1 in ETH.';
  }
  return `Each Preglyph costs about ${normalizedFeeDisplayUsd} in ETH.`;
}

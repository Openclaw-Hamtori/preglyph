export function getWriteFeeNotice(feeDisplayUsd) {
  const normalizedFeeDisplayUsd = String(feeDisplayUsd || '').trim();
  if (!normalizedFeeDisplayUsd) {
    return 'Each Preglyph costs about $1 in ETH (base).';
  }
  return `Each Preglyph costs about ${normalizedFeeDisplayUsd} in ETH (base).`;
}

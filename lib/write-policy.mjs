import { formatEther } from 'ethers';

export const MAX_RECORD_LENGTH = 100;

export function getRecordContentLength(content = '') {
  return [...content].length;
}

export function isRecordContentWithinLimit(content = '') {
  return getRecordContentLength(content) <= MAX_RECORD_LENGTH;
}

export function truncateRecordContent(content = '', maxLength = MAX_RECORD_LENGTH) {
  return Array.from(content).slice(0, maxLength).join('');
}

export function formatWriteFeeLabel(writeFeeWei, currencySymbol = 'ETH') {
  return `${formatEther(writeFeeWei)} ${currencySymbol}`;
}

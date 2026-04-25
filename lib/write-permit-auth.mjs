import { hashMessage, isAddress, keccak256, recoverAddress, toUtf8Bytes } from 'ethers';

import { normalizeInscriptionMode } from './inscription-mode.mjs';

export const DEFAULT_WRITE_PERMIT_AUTH_WINDOW_SECONDS = 300;

function normalizeIssuedAt(issuedAt) {
  const value = Number(issuedAt);
  return Number.isFinite(value) ? Math.floor(value) : NaN;
}

export function buildWritePermitAuthMessage({ author, content, inscriptionMode, chainId, contractAddress, issuedAt }) {
  const normalizedIssuedAt = normalizeIssuedAt(issuedAt);
  const contentHash = keccak256(toUtf8Bytes(String(content || '')));
  const normalizedInscriptionMode = normalizeInscriptionMode(inscriptionMode);

  return [
    'Preglyph write authorization',
    `Author: ${String(author || '').trim()}`,
    `Chain ID: ${Number(chainId)}`,
    `Contract: ${String(contractAddress || '').trim()}`,
    `Issued at: ${normalizedIssuedAt}`,
    `3D inscription mode: ${normalizedInscriptionMode}`,
    `Content hash: ${contentHash}`,
  ].join('\n');
}

export function verifyWritePermitAuth({
  author,
  content,
  inscriptionMode,
  chainId,
  contractAddress,
  issuedAt,
  signature,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = DEFAULT_WRITE_PERMIT_AUTH_WINDOW_SECONDS,
}) {
  const normalizedAuthor = String(author || '').trim();
  const normalizedContractAddress = String(contractAddress || '').trim();
  const normalizedIssuedAt = normalizeIssuedAt(issuedAt);
  const normalizedNowSeconds = normalizeIssuedAt(nowSeconds);
  const normalizedMaxAgeSeconds = normalizeIssuedAt(maxAgeSeconds);

  if (!isAddress(normalizedAuthor) || !isAddress(normalizedContractAddress)) {
    return false;
  }

  if (!Number.isFinite(Number(chainId)) || !Number.isFinite(normalizedIssuedAt) || !Number.isFinite(normalizedNowSeconds)) {
    return false;
  }

  if (!signature || typeof signature !== 'string') {
    return false;
  }

  if (normalizedMaxAgeSeconds > 0) {
    const ageSeconds = normalizedNowSeconds - normalizedIssuedAt;
    if (ageSeconds < 0 || ageSeconds > normalizedMaxAgeSeconds) {
      return false;
    }
  }

  try {
    const message = buildWritePermitAuthMessage({
      author: normalizedAuthor,
      content,
      inscriptionMode,
      chainId,
      contractAddress: normalizedContractAddress,
      issuedAt: normalizedIssuedAt,
    });
    const digest = hashMessage(message);
    const recoveredAddress = recoverAddress(digest, signature);
    return recoveredAddress.toLowerCase() === normalizedAuthor.toLowerCase();
  } catch {
    return false;
  }
}

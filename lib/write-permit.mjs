import { Wallet, getBytes, isAddress, keccak256, solidityPackedKeccak256, toUtf8Bytes } from 'ethers';

import { getInscriptionModeCode, normalizeInscriptionMode } from './inscription-mode.mjs';

export function buildWritePermitDigest({ contractAddress, chainId, author, content, inscriptionMode, expiresAt, nonce, feeWei = 0n }) {
  return solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint8', 'uint256', 'bytes32', 'uint256'],
    [contractAddress, chainId, author, keccak256(toUtf8Bytes(content)), getInscriptionModeCode(inscriptionMode), expiresAt, nonce, feeWei],
  );
}

export function assertPermitSignerMatchesConfiguredAddress({ signerPrivateKey, expectedSignerAddress }) {
  if (!signerPrivateKey) {
    throw new Error('Preglyph write signer is not configured.');
  }

  if (!isAddress(expectedSignerAddress)) {
    throw new Error('Configured permit signer address is invalid.');
  }

  const signer = new Wallet(signerPrivateKey);
  if (signer.address.toLowerCase() !== String(expectedSignerAddress).toLowerCase()) {
    throw new Error('Preglyph write signer key does not match configured permit signer address.');
  }

  return signer.address;
}

export async function signWritePermit({ signerPrivateKey, contractAddress, chainId, author, content, inscriptionMode, expiresAt, nonce, feeWei = 0n }) {
  const signer = new Wallet(signerPrivateKey);
  const normalizedInscriptionMode = normalizeInscriptionMode(inscriptionMode);
  const digest = buildWritePermitDigest({
    contractAddress,
    chainId,
    author,
    content,
    inscriptionMode: normalizedInscriptionMode,
    expiresAt,
    nonce,
    feeWei,
  });
  const signature = await signer.signMessage(getBytes(digest));

  return {
    digest,
    expiresAt,
    nonce,
    feeWei,
    inscriptionMode: normalizedInscriptionMode,
    signature,
    signerAddress: signer.address,
  };
}

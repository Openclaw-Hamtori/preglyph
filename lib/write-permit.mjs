import { Wallet, getBytes, keccak256, solidityPackedKeccak256, toUtf8Bytes } from 'ethers';

export function buildWritePermitDigest({ contractAddress, chainId, author, content, expiresAt, nonce }) {
  return solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint256', 'bytes32'],
    [contractAddress, chainId, author, keccak256(toUtf8Bytes(content)), expiresAt, nonce],
  );
}

export async function signWritePermit({ signerPrivateKey, contractAddress, chainId, author, content, expiresAt, nonce }) {
  const signer = new Wallet(signerPrivateKey);
  const digest = buildWritePermitDigest({ contractAddress, chainId, author, content, expiresAt, nonce });
  const signature = await signer.signMessage(getBytes(digest));

  return {
    digest,
    expiresAt,
    nonce,
    signature,
    signerAddress: signer.address,
  };
}

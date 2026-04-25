import test from 'node:test';
import assert from 'node:assert/strict';

import { Wallet } from 'ethers';

import { buildWritePermitDigest, signWritePermit } from '../../lib/write-permit.mjs';

test('buildWritePermitDigest changes when contract, content, mode, or fee changes', () => {
  const base = {
    contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
    chainId: 11155111,
    author: '0x309e4687652E99dD34404281e7D4F2047639Bb53',
    content: 'hello preglyph',
    inscriptionMode: 'horizontal',
    expiresAt: 1710000000,
    nonce: '0x' + '11'.repeat(32),
    feeWei: 555555555555555n,
  };

  const digest = buildWritePermitDigest(base);
  assert.notEqual(digest, buildWritePermitDigest({ ...base, content: 'hello other' }));
  assert.notEqual(digest, buildWritePermitDigest({ ...base, contractAddress: '0xE68bfcd6F460dF9c08605BDA84bF6c6bCF018D3C' }));
  assert.notEqual(digest, buildWritePermitDigest({ ...base, inscriptionMode: 'ujongseo' }));
  assert.notEqual(digest, buildWritePermitDigest({ ...base, feeWei: 555555555555556n }));
});

test('signWritePermit returns a reusable permit envelope', async () => {
  const wallet = new Wallet('0x59c6995e998f97a5a0044976f8f6dcd6c9f6f38c75f5ad7881e5341e20f40812');
  const permit = await signWritePermit({
    signerPrivateKey: wallet.privateKey,
    contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
    chainId: 11155111,
    author: '0x309e4687652E99dD34404281e7D4F2047639Bb53',
    content: 'hello preglyph',
    expiresAt: 1710000000,
    nonce: '0x' + '22'.repeat(32),
    feeWei: 777777777777777n,
  });

  assert.equal(permit.expiresAt, 1710000000);
  assert.equal(permit.feeWei, 777777777777777n);
  assert.equal(permit.nonce, '0x' + '22'.repeat(32));
  assert.match(permit.signature, /^0x[0-9a-fA-F]+$/);
  assert.equal(permit.signerAddress.toLowerCase(), wallet.address.toLowerCase());
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { Wallet } from 'ethers';

import { buildWritePermitAuthMessage, verifyWritePermitAuth } from '../../lib/write-permit-auth.mjs';

test('buildWritePermitAuthMessage binds the request to contract, chain, author, mode, and content hash', () => {
  const message = buildWritePermitAuthMessage({
    author: '0x309e4687652E99dD34404281e7D4F2047639Bb53',
    content: 'hello preglyph',
    inscriptionMode: 'ujongseo',
    chainId: 11155111,
    contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
    issuedAt: 1710000000,
  });

  assert.match(message, /Preglyph write authorization/);
  assert.match(message, /Author: 0x309e4687652E99dD34404281e7D4F2047639Bb53/);
  assert.match(message, /Chain ID: 11155111/);
  assert.match(message, /Contract: 0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe/);
  assert.match(message, /Issued at: 1710000000/);
  assert.match(message, /3D inscription mode: ujongseo/i);
  assert.match(message, /Content hash: 0x[0-9a-f]{64}/i);
  assert.ok(!message.includes('hello preglyph'));
});

test('verifyWritePermitAuth accepts the matching author signature and rejects tampered content', async () => {
  const wallet = new Wallet('0x8b3a350cf5c34c9194ca3b7d53d63f6d2f5dcad2c4a6a2aef4f7c0f8b7b7e3c1');
  const payload = {
    author: wallet.address,
    content: 'hello preglyph',
    chainId: 11155111,
    contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
    issuedAt: 1710000000,
  };

  const signature = await wallet.signMessage(buildWritePermitAuthMessage(payload));

  assert.equal(
    verifyWritePermitAuth({ ...payload, signature, nowSeconds: 1710000001 }),
    true,
  );

  assert.equal(
    verifyWritePermitAuth({ ...payload, content: 'tampered content', signature, nowSeconds: 1710000001 }),
    false,
  );
});

test('verifyWritePermitAuth rejects stale signatures outside the allowed request window', async () => {
  const wallet = new Wallet('0x8b3a350cf5c34c9194ca3b7d53d63f6d2f5dcad2c4a6a2aef4f7c0f8b7b7e3c1');
  const payload = {
    author: wallet.address,
    content: 'hello preglyph',
    chainId: 11155111,
    contractAddress: '0x3321077b39Bb1fBD1f9f342804af32BbF6B3b0fe',
    issuedAt: 1710000000,
  };

  const signature = await wallet.signMessage(buildWritePermitAuthMessage(payload));

  assert.equal(
    verifyWritePermitAuth({ ...payload, signature, nowSeconds: 1710000301, maxAgeSeconds: 300 }),
    false,
  );
});

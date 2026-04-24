import test from 'node:test';
import assert from 'node:assert/strict';

import { assertPermitSignerMatchesConfiguredAddress } from '../../lib/write-permit.mjs';

test('assertPermitSignerMatchesConfiguredAddress accepts the matching signer key and address', () => {
  const privateKey = '0x59c6995e998f97a5a0044976f8f6dcd6c9f6f38c75f5ad7881e5341e20f40812';

  assert.doesNotThrow(() => {
    assertPermitSignerMatchesConfiguredAddress({
      signerPrivateKey: privateKey,
      expectedSignerAddress: '0x2f608B546C61d120751cDa97B9f1B92983D33670',
    });
  });
});

test('assertPermitSignerMatchesConfiguredAddress rejects a mismatched signer key and address', () => {
  const privateKey = '0x59c6995e998f97a5a0044976f8f6dcd6c9f6f38c75f5ad7881e5341e20f40812';

  assert.throws(
    () => {
      assertPermitSignerMatchesConfiguredAddress({
        signerPrivateKey: privateKey,
        expectedSignerAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      });
    },
    /does not match configured permit signer/i,
  );
});

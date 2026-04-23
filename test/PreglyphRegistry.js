const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers } = require('hardhat');

function buildPermitPayload({ contractAddress, chainId, author, content, expiresAt, nonce }) {
  return ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint256', 'bytes32'],
    [contractAddress, chainId, author, ethers.keccak256(ethers.toUtf8Bytes(content)), expiresAt, nonce],
  );
}

describe('PreglyphRegistry', function () {
  async function deployFixture() {
    const [permitSigner, writer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('PreglyphRegistry');
    const contract = await factory.deploy(permitSigner.address);
    await contract.waitForDeployment();
    const network = await ethers.provider.getNetwork();
    return { contract, permitSigner, writer, other, chainId: Number(network.chainId) };
  }

  async function signPermit({ contract, permitSigner, chainId, author, content, expiresAt, nonce }) {
    const digest = buildPermitPayload({
      contractAddress: await contract.getAddress(),
      chainId,
      author,
      content,
      expiresAt,
      nonce,
    });

    const signature = await permitSigner.signMessage(ethers.getBytes(digest));
    return { digest, signature };
  }

  it('stores a record for a writer with a valid Preglyph permit', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'Preglyph test record';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
    });

    const tx = await contract.connect(writer).writeRecord(content, expiresAt, nonce, signature);
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, content, anyValue);

    const record = await contract.getRecord(1);
    expect(record.id).to.equal(1n);
    expect(record.author).to.equal(writer.address);
    expect(record.content).to.equal(content);
    expect(await contract.recordCount()).to.equal(1n);
  });

  it('rejects writes without a valid Preglyph permit signer', async function () {
    const { contract, writer, other, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const { signature } = await signPermit({
      contract,
      permitSigner: other,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, signature)).to.be.revertedWithCustomError(contract, 'InvalidWritePermit');
  });

  it('rejects replayed permits', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
    });

    await contract.connect(writer).writeRecord(content, expiresAt, nonce, signature);
    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, signature)).to.be.revertedWithCustomError(contract, 'WritePermitAlreadyUsed');
  });

  it('rejects expired permits', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const latest = await ethers.provider.getBlock('latest');
    const expiresAt = BigInt((latest?.timestamp || Math.floor(Date.now() / 1000)) - 1);
    const nonce = ethers.randomBytes(32);
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, signature)).to.be.revertedWithCustomError(contract, 'ExpiredWritePermit');
  });

  it('still rejects empty and overlong content', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const emptyExpiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const emptyNonce = ethers.randomBytes(32);
    const emptySignature = (await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content: '',
      expiresAt: emptyExpiresAt,
      nonce: emptyNonce,
    })).signature;

    const longContent = 'a'.repeat(281);
    const longExpiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const longNonce = ethers.randomBytes(32);
    const longSignature = (await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content: longContent,
      expiresAt: longExpiresAt,
      nonce: longNonce,
    })).signature;

    await expect(contract.connect(writer).writeRecord('', emptyExpiresAt, emptyNonce, emptySignature)).to.be.revertedWithCustomError(contract, 'EmptyContent');
    await expect(contract.connect(writer).writeRecord(longContent, longExpiresAt, longNonce, longSignature)).to.be.revertedWithCustomError(contract, 'ContentTooLong');
  });
});

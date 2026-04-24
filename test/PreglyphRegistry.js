const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers } = require('hardhat');

function buildPermitPayload({ contractAddress, chainId, author, content, expiresAt, nonce, feeWei = 0n }) {
  return ethers.solidityPackedKeccak256(
    ['address', 'uint256', 'address', 'bytes32', 'uint256', 'bytes32', 'uint256'],
    [contractAddress, chainId, author, ethers.keccak256(ethers.toUtf8Bytes(content)), expiresAt, nonce, feeWei],
  );
}

describe('PreglyphRegistry', function () {
  async function deployFixture() {
    const [permitSigner, treasury, writer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('PreglyphRegistry');
    const contract = await factory.deploy(permitSigner.address, treasury.address);
    await contract.waitForDeployment();
    const network = await ethers.provider.getNetwork();
    return { contract, permitSigner, treasury, writer, other, chainId: Number(network.chainId) };
  }

  async function signPermit({ contract, permitSigner, chainId, author, content, expiresAt, nonce, feeWei = 0n }) {
    const digest = buildPermitPayload({
      contractAddress: await contract.getAddress(),
      chainId,
      author,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    const signature = await permitSigner.signMessage(ethers.getBytes(digest));
    return { digest, signature };
  }

  it('stores a record for a writer with a valid Preglyph permit and forwards the fee to treasury', async function () {
    const { contract, permitSigner, treasury, writer, chainId } = await deployFixture();
    const content = 'Preglyph test record';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const feeWei = 500000000000000n;
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);
    const tx = await contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei });
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, content, anyValue);

    const record = await contract.getRecord(1);
    expect(record.id).to.equal(1n);
    expect(record.author).to.equal(writer.address);
    expect(record.content).to.equal(content);
    expect(await contract.recordCount()).to.equal(1n);
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(treasuryBalanceBefore + feeWei);
  });

  it('rejects writes without a valid Preglyph permit signer', async function () {
    const { contract, writer, other, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const feeWei = 500000000000000n;
    const { signature } = await signPermit({
      contract,
      permitSigner: other,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei })).to.be.revertedWithCustomError(contract, 'InvalidWritePermit');
  });

  it('rejects replayed permits', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const feeWei = 500000000000000n;
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    await contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei });
    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei })).to.be.revertedWithCustomError(contract, 'WritePermitAlreadyUsed');
  });

  it('rejects expired permits', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const latest = await ethers.provider.getBlock('latest');
    const expiresAt = BigInt((latest?.timestamp || Math.floor(Date.now() / 1000)) - 1);
    const nonce = ethers.randomBytes(32);
    const feeWei = 500000000000000n;
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: feeWei })).to.be.revertedWithCustomError(contract, 'ExpiredWritePermit');
  });

  it('uses a byte cap that still allows 100 Korean characters while rejecting oversized payloads', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    expect(await contract.MAX_CONTENT_LENGTH()).to.equal(400n);

    const feeWei = 500000000000000n;
    const validContent = '가'.repeat(100);
    const validExpiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const validNonce = ethers.randomBytes(32);
    const validSignature = (await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content: validContent,
      expiresAt: validExpiresAt,
      nonce: validNonce,
      feeWei,
    })).signature;

    await expect(contract.connect(writer).writeRecord(validContent, validExpiresAt, validNonce, feeWei, validSignature, { value: feeWei }))
      .to.emit(contract, 'RecordWritten')
      .withArgs(1n, writer.address, validContent, anyValue);

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
      feeWei,
    })).signature;

    const longContent = '가'.repeat(134);
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
      feeWei,
    })).signature;

    await expect(contract.connect(writer).writeRecord('', emptyExpiresAt, emptyNonce, feeWei, emptySignature, { value: feeWei })).to.be.revertedWithCustomError(contract, 'EmptyContent');
    await expect(contract.connect(writer).writeRecord(longContent, longExpiresAt, longNonce, feeWei, longSignature, { value: feeWei })).to.be.revertedWithCustomError(contract, 'ContentTooLong');
  });

  it('rejects writes when msg.value does not match the permit fee', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const feeWei = 500000000000000n;
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, feeWei, signature, { value: 0n }))
      .to.be.revertedWithCustomError(contract, 'IncorrectWriteFee');
  });

  it('rejects writes when the signed fee does not match the submitted fee', async function () {
    const { contract, permitSigner, writer, chainId } = await deployFixture();
    const content = 'writer one';
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);
    const nonce = ethers.randomBytes(32);
    const signedFeeWei = 500000000000000n;
    const submittedFeeWei = 500000000000001n;
    const { signature } = await signPermit({
      contract,
      permitSigner,
      chainId,
      author: writer.address,
      content,
      expiresAt,
      nonce,
      feeWei: signedFeeWei,
    });

    await expect(contract.connect(writer).writeRecord(content, expiresAt, nonce, submittedFeeWei, signature, { value: submittedFeeWei }))
      .to.be.revertedWithCustomError(contract, 'InvalidWritePermit');
  });

  it('allows the owner to rotate the permit signer', async function () {
    const { contract, treasury, other } = await deployFixture();

    await contract.connect(treasury).setPermitSigner(other.address);

    expect(await contract.owner()).to.equal(treasury.address);
    expect(await contract.permitSigner()).to.equal(other.address);
  });

  it('allows the owner to rotate the treasury', async function () {
    const { contract, treasury, other } = await deployFixture();

    await contract.connect(treasury).setTreasury(other.address);

    expect(await contract.treasury()).to.equal(other.address);
  });

  it('allows the owner to transfer ownership', async function () {
    const { contract, other, treasury } = await deployFixture();

    await contract.connect(treasury).transferOwnership(other.address);

    expect(await contract.owner()).to.equal(other.address);
    expect(await contract.treasury()).to.equal(treasury.address);
  });

  it('rejects non-owner signer or treasury rotations and zero-address updates', async function () {
    const { contract, permitSigner, other, writer, treasury } = await deployFixture();

    await expect(contract.connect(writer).setPermitSigner(other.address))
      .to.be.revertedWithCustomError(contract, 'NotOwner');
    await expect(contract.connect(writer).setTreasury(other.address))
      .to.be.revertedWithCustomError(contract, 'NotOwner');
    await expect(contract.connect(writer).transferOwnership(other.address))
      .to.be.revertedWithCustomError(contract, 'NotOwner');
    await expect(contract.connect(treasury).setPermitSigner(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(contract, 'InvalidPermitSigner');
    await expect(contract.connect(treasury).setTreasury(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(contract, 'InvalidTreasury');
    await expect(contract.connect(treasury).transferOwnership(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(contract, 'InvalidOwner');
    expect(await contract.permitSigner()).to.equal(permitSigner.address);
  });
});

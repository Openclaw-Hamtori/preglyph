const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers } = require('hardhat');

describe('PreglyphRegistry', function () {
  async function deployFixture() {
    const [writer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('PreglyphRegistry');
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    return { contract, writer, other };
  }

  it('stores a record for any connected writer', async function () {
    const { contract, writer } = await deployFixture();

    const tx = await contract.connect(writer).writeRecord('Preglyph test record');
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, 'Preglyph test record', anyValue);

    const record = await contract.getRecord(1);
    expect(record.id).to.equal(1n);
    expect(record.author).to.equal(writer.address);
    expect(record.content).to.equal('Preglyph test record');
    expect(await contract.recordCount()).to.equal(1n);
  });

  it('stores multiple records from different writers without approval setup', async function () {
    const { contract, writer, other } = await deployFixture();

    await contract.connect(writer).writeRecord('writer one');
    await contract.connect(other).writeRecord('writer two');

    const secondRecord = await contract.getRecord(2);
    expect(secondRecord.author).to.equal(other.address);
    expect(secondRecord.content).to.equal('writer two');
    expect(await contract.recordCount()).to.equal(2n);
  });

  it('still rejects empty and overlong content', async function () {
    const { contract, writer } = await deployFixture();

    await expect(contract.connect(writer).writeRecord('')).to.be.revertedWithCustomError(contract, 'EmptyContent');
    await expect(contract.connect(writer).writeRecord('a'.repeat(281))).to.be.revertedWithCustomError(contract, 'ContentTooLong');
  });
});

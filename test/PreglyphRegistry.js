const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers } = require('hardhat');

describe('PreglyphRegistry', function () {
  async function deployFixture() {
    const [owner, writer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('PreglyphRegistry');
    const contract = await factory.deploy(owner.address);
    await contract.waitForDeployment();
    return { contract, owner, writer, other };
  }

  it('only allows the owner to approve writers', async function () {
    const { contract, writer, other } = await deployFixture();

    await expect(contract.connect(other).setWriterApproval(writer.address, true)).to.be.revertedWithCustomError(
      contract,
      'NotOwner',
    );

    await expect(contract.setWriterApproval(writer.address, true))
      .to.emit(contract, 'WriterApprovalUpdated')
      .withArgs(writer.address, true, anyValue);

    expect(await contract.approvedWriters(writer.address)).to.equal(true);
  });

  it('blocks non-approved writers from writing', async function () {
    const { contract, writer } = await deployFixture();

    await expect(contract.connect(writer).writeRecord('hello world')).to.be.revertedWithCustomError(
      contract,
      'WriterNotApproved',
    );
  });

  it('stores a record for an approved writer', async function () {
    const { contract, writer } = await deployFixture();
    await contract.setWriterApproval(writer.address, true);

    const tx = await contract.connect(writer).writeRecord('Preglyph test record');
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, 'Preglyph test record', anyValue);

    const record = await contract.getRecord(1);
    expect(record.id).to.equal(1n);
    expect(record.author).to.equal(writer.address);
    expect(record.content).to.equal('Preglyph test record');
    expect(await contract.recordCount()).to.equal(1n);
  });
});

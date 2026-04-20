const { expect } = require('chai');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers } = require('hardhat');
const { ZeroAddress, AbiCoder, Interface } = require('ethers');

describe('PreglyphRegistry', function () {
  async function deployFixture() {
    const [owner, writer, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('PreglyphRegistry');
    const contract = await factory.deploy(owner.address, ethers.parseEther('0.001'));
    await contract.waitForDeployment();
    return { contract, owner, writer, other };
  }

  it('allows any connected wallet to write once the exact fee is paid', async function () {
    const { contract, writer } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();

    const tx = await contract.connect(writer).writeRecord('hello world', { value: fee });
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, 'hello world', anyValue);
  });

  it('rejects records longer than 100 characters', async function () {
    const { contract, writer } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();
    const tooLongContent = 'x'.repeat(101);

    await expect(
      contract.connect(writer).writeRecord(tooLongContent, { value: fee }),
    ).to.be.revertedWithCustomError(contract, 'ContentTooLong');
  });

  it('requires the exact write fee before recording', async function () {
    const { contract, writer } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();

    await expect(
      contract.connect(writer).writeRecord('paid write', { value: fee - 1n }),
    ).to.be.revertedWithCustomError(contract, 'InvalidWriteFee');

    await expect(
      contract.connect(writer).writeRecord('paid write', { value: fee + 1n }),
    ).to.be.revertedWithCustomError(contract, 'InvalidWriteFee');

    const tx = await contract.connect(writer).writeRecord('paid write', { value: fee });
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, 'paid write', anyValue);
    expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(fee);
  });

  it('rejects malformed UTF-8 calldata even if the raw bytes could bypass the character counter', async function () {
    const { contract, writer } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();
    const iface = new Interface(['function writeRecord(string content) payable returns (uint256)']);
    const badBytes = '0x' + '80'.repeat(150);
    const encodedArgs = AbiCoder.defaultAbiCoder().encode(['bytes'], [badBytes]);
    const data = iface.getFunction('writeRecord').selector + encodedArgs.slice(2);

    await expect(
      writer.sendTransaction({
        to: await contract.getAddress(),
        data,
        value: fee,
      }),
    ).to.be.revertedWithCustomError(contract, 'InvalidUtf8Content');
  });

  it('stores a record after a paid registration', async function () {
    const { contract, writer } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();

    const tx = await contract.connect(writer).writeRecord('Preglyph test record', { value: fee });
    await expect(tx).to.emit(contract, 'RecordWritten').withArgs(1n, writer.address, 'Preglyph test record', anyValue);

    const record = await contract.getRecord(1);
    expect(record.id).to.equal(1n);
    expect(record.author).to.equal(writer.address);
    expect(record.content).to.equal('Preglyph test record');
    expect(await contract.recordCount()).to.equal(1n);
  });

  it('lets the owner withdraw accumulated fees to a non-zero recipient', async function () {
    const { contract, owner, writer, other } = await deployFixture();
    const fee = await contract.WRITE_FEE_WEI();

    await contract.connect(writer).writeRecord('paid write', { value: fee });

    await expect(contract.connect(other).withdrawFees(other.address)).to.be.revertedWithCustomError(contract, 'NotOwner');
    await expect(contract.withdrawFees(ZeroAddress)).to.be.revertedWithCustomError(contract, 'InvalidRecipient');

    await expect(() => contract.withdrawFees(owner.address)).to.changeEtherBalances(
      [contract, owner],
      [-fee, fee],
    );
  });
});

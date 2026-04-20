const hre = require('hardhat');

const DEFAULT_WRITE_FEE_WEI = '1000000000000000';

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const writeFeeWei = process.env.PREGLYPH_WRITE_FEE_WEI || process.env.NEXT_PUBLIC_PREGLYPH_WRITE_FEE_WEI || DEFAULT_WRITE_FEE_WEI;
  const factory = await hre.ethers.getContractFactory('PreglyphRegistry');
  const contract = await factory.deploy(deployer.address, writeFeeWei);
  await contract.waitForDeployment();

  console.log(
    JSON.stringify(
      {
        contractAddress: await contract.getAddress(),
        owner: deployer.address,
        network: hre.network.name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
        writeFeeWei,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

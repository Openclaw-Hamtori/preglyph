const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory('PreglyphRegistry');
  const contract = await factory.deploy(deployer.address);
  await contract.waitForDeployment();

  console.log(
    JSON.stringify(
      {
        contractAddress: await contract.getAddress(),
        owner: deployer.address,
        network: hre.network.name,
        chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
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

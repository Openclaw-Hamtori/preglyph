const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractFactory('PreglyphRegistry');
  const contract = await factory.deploy();
  const deploymentTx = contract.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  await contract.waitForDeployment();

  console.log(
    JSON.stringify(
      {
        contractAddress: await contract.getAddress(),
        deployer: deployer.address,
        deployBlock: receipt?.blockNumber || null,
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

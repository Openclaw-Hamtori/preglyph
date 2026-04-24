const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasuryAddress = process.env.PREGLYPH_FEE_TREASURY_ADDRESS;
  const permitSignerAddress = process.env.PREGLYPH_PERMIT_SIGNER_ADDRESS;

  if (!treasuryAddress) {
    throw new Error('Missing required env: PREGLYPH_FEE_TREASURY_ADDRESS');
  }

  if (!permitSignerAddress) {
    throw new Error('Missing required env: PREGLYPH_PERMIT_SIGNER_ADDRESS');
  }

  const factory = await hre.ethers.getContractFactory('PreglyphRegistry');
  const contract = await factory.deploy(permitSignerAddress, treasuryAddress);
  const deploymentTx = contract.deploymentTransaction();
  const receipt = deploymentTx ? await deploymentTx.wait() : null;
  await contract.waitForDeployment();

  console.log(
    JSON.stringify(
      {
        contractAddress: await contract.getAddress(),
        deployer: deployer.address,
        permitSigner: permitSignerAddress,
        treasury: treasuryAddress,
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

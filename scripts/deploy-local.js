const fs = require('node:fs');
const path = require('node:path');
const hre = require('hardhat');

const LOCAL_ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEFAULT_WRITE_FEE_WEI = '1000000000000000';
const ENV_PATH = path.join(process.cwd(), '.env.local');

function upsertEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=.*$`, 'm').test(content)) {
    return content.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  }
  return `${content.trim()}${content.trim() ? '\n' : ''}${line}\n`;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const writeFeeWei = process.env.PREGLYPH_WRITE_FEE_WEI || process.env.NEXT_PUBLIC_PREGLYPH_WRITE_FEE_WEI || DEFAULT_WRITE_FEE_WEI;
  const factory = await hre.ethers.getContractFactory('PreglyphRegistry');
  const contract = await factory.deploy(deployer.address, writeFeeWei);
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  envContent = upsertEnvValue(envContent, 'PREGLYPH_RPC_URL', 'http://127.0.0.1:8545');
  envContent = upsertEnvValue(envContent, 'PREGLYPH_CHAIN_ID', '31337');
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_CHAIN_ID', '31337');
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_RPC_HTTP_URL', 'http://127.0.0.1:8545');
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_CHAIN_NAME', 'Preglyph Testchain');
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_CURRENCY_SYMBOL', 'ETH');
  envContent = upsertEnvValue(envContent, 'PREGLYPH_WRITE_FEE_WEI', writeFeeWei);
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_WRITE_FEE_WEI', writeFeeWei);
  envContent = upsertEnvValue(envContent, 'PREGLYPH_CONTRACT_ADDRESS', contractAddress);
  envContent = upsertEnvValue(envContent, 'NEXT_PUBLIC_PREGLYPH_CONTRACT_ADDRESS', contractAddress);
  envContent = upsertEnvValue(envContent, 'PREGLYPH_ADMIN_PRIVATE_KEY', LOCAL_ADMIN_PRIVATE_KEY);
  envContent = upsertEnvValue(envContent, 'PREGLYPH_PRESENCE_SERVICE_ID', 'noctu');
  envContent = upsertEnvValue(envContent, 'PREGLYPH_PRESENCE_FLOW_TYPE', 'verify');
  envContent = upsertEnvValue(envContent, 'PREGLYPH_PRESENCE_ENDPOINT_REF', 'verify-proof');
  envContent = upsertEnvValue(envContent, 'PREGLYPH_PRESENCE_AUTH_CONTEXT', 'service-auth-context');
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');

  console.log(JSON.stringify({
    contractAddress,
    owner: deployer.address,
    writeFeeWei,
    envPath: ENV_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

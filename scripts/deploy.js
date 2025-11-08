const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../contracts/.env') });

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('Deploying contracts with the account:', wallet.address);

  // 1. Deploy UniswapV2TwapOracle
  const oracleArtifact = require('../contracts/out/UniswapV2TwapOracle.sol/UniswapV2TwapOracle.json');
  const OracleFactory = new ethers.ContractFactory(oracleArtifact.abi, oracleArtifact.bytecode, wallet);
  const oracle = await OracleFactory.deploy();
  await oracle.waitForDeployment();

  console.log('UniswapV2TwapOracle deployed to:', await oracle.getAddress());

  // 2. Deploy ArbitrageBalancer
  const balancerArtifact = require('../contracts/out/ArbitrageBalancer.sol/ArbitrageBalancer.json');
  const BalancerFactory = new ethers.ContractFactory(balancerArtifact.abi, balancerArtifact.bytecode, wallet);

  const vaultAddress = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'; // Base Mainnet Vault
  const multisigAddress = process.env.MULTISIG_ADDRESS;
  const oracleAddress = await oracle.getAddress();

  const arbitrageBalancer = await BalancerFactory.deploy(vaultAddress, multisigAddress);
  await arbitrageBalancer.waitForDeployment();

  console.log('ArbitrageBalancer deployed to:', await arbitrageBalancer.getAddress());

  // 3. Save deployment artifacts
  const deploymentDir = path.join(__dirname, '..', 'deployments', 'base-mainnet');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentDir, 'UniswapV2TwapOracle.json'),
    JSON.stringify({ address: await oracle.getAddress(), abi: oracleArtifact.abi }, null, 2)
  );

  fs.writeFileSync(
    path.join(deploymentDir, 'ArbitrageBalancer.json'),
    JSON.stringify({ address: await arbitrageBalancer.getAddress(), abi: balancerArtifact.abi }, null, 2)
  );

  console.log('Deployment artifacts saved to deployments/base-mainnet');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

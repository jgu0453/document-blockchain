import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address}`);

  const registry = await ethers.deployContract("DocumentRegistry", [deployer.address]);
  await registry.waitForDeployment();

  console.log(`DocumentRegistry deployed to ${await registry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

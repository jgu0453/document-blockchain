import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address}`);

  const registry = await ethers.deployContract("DocumentRegistry");
  await registry.waitForDeployment();
  console.log(`DocumentRegistry deployed to ${await registry.getAddress()}`);

  const factory = await ethers.deployContract("DocumentRegistryFactory");
  await factory.waitForDeployment();
  console.log(`DocumentRegistryFactory deployed to ${await factory.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
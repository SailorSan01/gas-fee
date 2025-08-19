const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy MinimalForwarder
  console.log("\n1. Deploying MinimalForwarder...");
  const MinimalForwarder = await ethers.getContractFactory("GaslessMinimalForwarder");
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("MinimalForwarder deployed to:", forwarderAddress);

  // Deploy WithdrawManager
  console.log("\n2. Deploying WithdrawManager...");
  const WithdrawManager = await ethers.getContractFactory("WithdrawManager");
  const withdrawManager = await WithdrawManager.deploy(forwarderAddress);
  await withdrawManager.waitForDeployment();
  const withdrawManagerAddress = await withdrawManager.getAddress();
  console.log("WithdrawManager deployed to:", withdrawManagerAddress);

  // Deploy Guardian
  console.log("\n3. Deploying Guardian...");
  const Guardian = await ethers.getContractFactory("Guardian");
  const proposers = [deployer.address]; // Deployer can propose
  const executors = [deployer.address]; // Deployer can execute
  const guardian = await Guardian.deploy(proposers, executors);
  await guardian.waitForDeployment();
  const guardianAddress = await guardian.getAddress();
  console.log("Guardian deployed to:", guardianAddress);

  // Deploy Paymaster (EXPERIMENTAL)
  console.log("\n4. Deploying Paymaster (EXPERIMENTAL)...");
  const Paymaster = await ethers.getContractFactory("Paymaster");
  // For demo purposes, use a dummy EntryPoint address
  const dummyEntryPoint = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // Official EntryPoint on mainnet
  const paymaster = await Paymaster.deploy(dummyEntryPoint);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log("Paymaster deployed to:", paymasterAddress);

  // Deploy Test Tokens
  console.log("\n5. Deploying Test Tokens...");
  
  // Deploy TestERC20
  const TestERC20 = await ethers.getContractFactory("TestERC20");
  const testERC20 = await TestERC20.deploy("Test Token", "TEST");
  await testERC20.waitForDeployment();
  const testERC20Address = await testERC20.getAddress();
  console.log("TestERC20 deployed to:", testERC20Address);

  // Deploy TestERC721
  const TestERC721 = await ethers.getContractFactory("TestERC721");
  const testERC721 = await TestERC721.deploy("Test NFT", "TNFT");
  await testERC721.waitForDeployment();
  const testERC721Address = await testERC721.getAddress();
  console.log("TestERC721 deployed to:", testERC721Address);

  // Deploy TestERC1155
  const TestERC1155 = await ethers.getContractFactory("TestERC1155");
  const testERC1155 = await TestERC1155.deploy();
  await testERC1155.waitForDeployment();
  const testERC1155Address = await testERC1155.getAddress();
  console.log("TestERC1155 deployed to:", testERC1155Address);

  // Save deployment addresses
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      MinimalForwarder: forwarderAddress,
      WithdrawManager: withdrawManagerAddress,
      Guardian: guardianAddress,
      Paymaster: paymasterAddress,
      TestERC20: testERC20Address,
      TestERC721: testERC721Address,
      TestERC1155: testERC1155Address
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const filename = `deployment-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to: deployments/${filename}`);

  // Also save as latest.json for easy reference
  fs.writeFileSync(
    path.join(deploymentsDir, "latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Latest deployment info saved to: deployments/latest.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


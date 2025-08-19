import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ethers } from 'ethers';
import { loadConfig } from '../utils/config';
import { getProvider, getSigner } from '../utils/blockchain';
import { saveDeployment, loadDeployment } from '../utils/deployment';

export const deployCommand = new Command('deploy')
  .description('Deploy contracts to specified network')
  .option('-n, --network <network>', 'Network to deploy to', 'localhost')
  .option('-f, --force', 'Force redeploy even if contracts exist')
  .option('--dry-run', 'Simulate deployment without actually deploying')
  .action(async (options) => {
    const spinner = ora('Initializing deployment...').start();
    
    try {
      const config = loadConfig();
      const { network, force, dryRun } = options;

      // Validate network
      if (!['ethereum', 'bsc', 'polygon', 'localhost'].includes(network)) {
        throw new Error(`Unsupported network: ${network}`);
      }

      spinner.text = `Connecting to ${network} network...`;
      
      const provider = getProvider(network);
      const signer = getSigner(network, provider);
      
      // Check if contracts are already deployed
      if (!force) {
        const existingDeployment = loadDeployment(network);
        if (existingDeployment) {
          spinner.succeed(chalk.green('Contracts already deployed!'));
          console.log(chalk.blue('\nExisting deployment:'));
          console.log(JSON.stringify(existingDeployment, null, 2));
          console.log(chalk.yellow('\nUse --force to redeploy'));
          return;
        }
      }

      if (dryRun) {
        spinner.info(chalk.yellow('Dry run mode - no actual deployment'));
      }

      // Get deployer info
      const deployerAddress = await signer.getAddress();
      const balance = await provider.getBalance(deployerAddress);
      
      spinner.text = 'Checking deployer account...';
      console.log(chalk.blue(`\nDeployer: ${deployerAddress}`));
      console.log(chalk.blue(`Balance: ${ethers.formatEther(balance)} ETH`));

      if (balance === 0n) {
        throw new Error('Deployer account has no funds');
      }

      const deploymentResult: any = {
        network,
        deployer: deployerAddress,
        contracts: {},
        timestamp: new Date().toISOString()
      };

      // Deploy MinimalForwarder
      spinner.text = 'Deploying MinimalForwarder...';
      if (!dryRun) {
        const forwarderFactory = new ethers.ContractFactory(
          MINIMAL_FORWARDER_ABI,
          MINIMAL_FORWARDER_BYTECODE,
          signer
        );
        
        const forwarder = await forwarderFactory.deploy();
        await forwarder.waitForDeployment();
        
        deploymentResult.contracts.MinimalForwarder = await forwarder.getAddress();
        console.log(chalk.green(`✓ MinimalForwarder deployed: ${deploymentResult.contracts.MinimalForwarder}`));
      } else {
        console.log(chalk.yellow('✓ MinimalForwarder (dry run)'));
      }

      // Deploy WithdrawManager
      spinner.text = 'Deploying WithdrawManager...';
      if (!dryRun) {
        const withdrawManagerFactory = new ethers.ContractFactory(
          WITHDRAW_MANAGER_ABI,
          WITHDRAW_MANAGER_BYTECODE,
          signer
        );
        
        const withdrawManager = await withdrawManagerFactory.deploy(
          deploymentResult.contracts.MinimalForwarder
        );
        await withdrawManager.waitForDeployment();
        
        deploymentResult.contracts.WithdrawManager = await withdrawManager.getAddress();
        console.log(chalk.green(`✓ WithdrawManager deployed: ${deploymentResult.contracts.WithdrawManager}`));
      } else {
        console.log(chalk.yellow('✓ WithdrawManager (dry run)'));
      }

      // Deploy Guardian
      spinner.text = 'Deploying Guardian...';
      if (!dryRun) {
        const guardianFactory = new ethers.ContractFactory(
          GUARDIAN_ABI,
          GUARDIAN_BYTECODE,
          signer
        );
        
        const guardian = await guardianFactory.deploy([deployerAddress], [deployerAddress]);
        await guardian.waitForDeployment();
        
        deploymentResult.contracts.Guardian = await guardian.getAddress();
        console.log(chalk.green(`✓ Guardian deployed: ${deploymentResult.contracts.Guardian}`));
      } else {
        console.log(chalk.yellow('✓ Guardian (dry run)'));
      }

      // Deploy test tokens (only for localhost)
      if (network === 'localhost') {
        spinner.text = 'Deploying test tokens...';
        if (!dryRun) {
          // Deploy TestERC20
          const erc20Factory = new ethers.ContractFactory(
            TEST_ERC20_ABI,
            TEST_ERC20_BYTECODE,
            signer
          );
          const testERC20 = await erc20Factory.deploy('Test Token', 'TEST');
          await testERC20.waitForDeployment();
          deploymentResult.contracts.TestERC20 = await testERC20.getAddress();

          // Deploy TestERC721
          const erc721Factory = new ethers.ContractFactory(
            TEST_ERC721_ABI,
            TEST_ERC721_BYTECODE,
            signer
          );
          const testERC721 = await erc721Factory.deploy('Test NFT', 'TNFT');
          await testERC721.waitForDeployment();
          deploymentResult.contracts.TestERC721 = await testERC721.getAddress();

          // Deploy TestERC1155
          const erc1155Factory = new ethers.ContractFactory(
            TEST_ERC1155_ABI,
            TEST_ERC1155_BYTECODE,
            signer
          );
          const testERC1155 = await erc1155Factory.deploy();
          await testERC1155.waitForDeployment();
          deploymentResult.contracts.TestERC1155 = await testERC1155.getAddress();

          console.log(chalk.green(`✓ Test tokens deployed`));
        } else {
          console.log(chalk.yellow('✓ Test tokens (dry run)'));
        }
      }

      if (!dryRun) {
        // Save deployment info
        saveDeployment(network, deploymentResult);
        spinner.succeed(chalk.green('Deployment completed successfully!'));
      } else {
        spinner.succeed(chalk.yellow('Dry run completed!'));
      }

      console.log(chalk.blue('\nDeployment Summary:'));
      console.log(JSON.stringify(deploymentResult, null, 2));

      if (!dryRun) {
        console.log(chalk.green('\n✓ Deployment info saved to deployments directory'));
        console.log(chalk.blue('\nNext steps:'));
        console.log('1. Update your .env file with the contract addresses');
        console.log('2. Configure the relayer backend with these addresses');
        console.log('3. Set up policy rules using: relayer-cli policy set');
      }

    } catch (error) {
      spinner.fail(chalk.red('Deployment failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Contract ABIs and Bytecodes (simplified for demo)
// In a real implementation, these would be imported from compiled contract artifacts

const MINIMAL_FORWARDER_ABI = [
  "constructor()",
  "function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) view returns (bool)",
  "function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) payable returns (bool, bytes)"
];

const MINIMAL_FORWARDER_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806347153f8214603757806382ad56cb14604c575b600080fd5b604a6042366004606b565b505050600190565b005b60596057366004606b565b5050565b604051901515815260200160405180910390f35b600080600080600080600060e0888a03121560a057600080fd5b505050505050505056fea2646970667358221220"; // Placeholder bytecode

const WITHDRAW_MANAGER_ABI = [
  "constructor(address trustedForwarder)",
  "function withdrawERC20(address token, uint256 amount)",
  "function withdrawERC721(address token, uint256 tokenId)",
  "function withdrawERC1155(address token, uint256 tokenId, uint256 amount)"
];

const WITHDRAW_MANAGER_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b50600436106100365760003560e01c8063"; // Placeholder bytecode

const GUARDIAN_ABI = [
  "constructor(address[] proposers, address[] executors)",
  "function emergencyPause()",
  "function emergencyUnpause()"
];

const GUARDIAN_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b50600436106100365760003560e01c8063"; // Placeholder bytecode

const TEST_ERC20_ABI = [
  "constructor(string name, string symbol)",
  "function mint(address to, uint256 amount)"
];

const TEST_ERC20_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b50600436106100365760003560e01c8063"; // Placeholder bytecode

const TEST_ERC721_ABI = [
  "constructor(string name, string symbol)",
  "function mint(address to) returns (uint256)"
];

const TEST_ERC721_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b50600436106100365760003560e01c8063"; // Placeholder bytecode

const TEST_ERC1155_ABI = [
  "constructor()",
  "function mint(address to, uint256 tokenId, uint256 amount, bytes data)"
];

const TEST_ERC1155_BYTECODE = "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b50600436106100365760003560e01c8063"; // Placeholder bytecode


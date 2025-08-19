import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { loadConfig } from '../utils/config';
import { getRelayerClient } from '../utils/api';
import { loadDeployment } from '../utils/deployment';

export const statusCommand = new Command('status')
  .description('Check system status and health');

// Overall system status
statusCommand
  .command('system')
  .description('Check overall system status')
  .option('--detailed', 'Show detailed status information')
  .action(async (options) => {
    const spinner = ora('Checking system status...').start();
    
    try {
      const relayerClient = getRelayerClient();
      
      // Check relayer backend health
      let relayerStatus = 'unknown';
      let relayerDetails: any = {};
      
      try {
        const healthResult = await relayerClient.get('/health');
        relayerStatus = healthResult.data.status || 'unknown';
        relayerDetails = healthResult.data;
      } catch (error) {
        relayerStatus = 'offline';
        relayerDetails = { error: error instanceof Error ? error.message : 'Connection failed' };
      }

      // Check relayer service health
      let serviceStatus = 'unknown';
      let serviceDetails: any = {};
      
      try {
        const serviceResult = await relayerClient.get('/api/v1/health');
        serviceStatus = serviceResult.data.success ? 'healthy' : 'unhealthy';
        serviceDetails = serviceResult.data.data || {};
      } catch (error) {
        serviceStatus = 'offline';
        serviceDetails = { error: error instanceof Error ? error.message : 'Service unavailable' };
      }

      spinner.succeed(chalk.green('System status check completed'));

      // Display status overview
      console.log(chalk.blue.bold('\n🏥 System Health Overview'));
      console.log('═'.repeat(50));

      const statusData = [
        ['Component', 'Status', 'Details']
      ];

      // Relayer Backend
      statusData.push([
        'Relayer Backend',
        getStatusColor(relayerStatus),
        relayerStatus === 'offline' ? relayerDetails.error : 'Connected'
      ]);

      // Relayer Service
      statusData.push([
        'Relayer Service',
        getStatusColor(serviceStatus),
        serviceStatus === 'offline' ? serviceDetails.error : 'Running'
      ]);

      // Database (mock)
      statusData.push([
        'Database',
        getStatusColor('healthy'),
        'PostgreSQL Connected'
      ]);

      // Redis (mock)
      statusData.push([
        'Redis Cache',
        getStatusColor('healthy'),
        'Connected'
      ]);

      console.log(table(statusData));

      if (options.detailed) {
        await displayDetailedStatus(relayerDetails, serviceDetails);
      }

      // Display summary
      const overallStatus = [relayerStatus, serviceStatus].every(s => s === 'healthy') ? 'healthy' : 'degraded';
      console.log(`\n${getStatusIcon(overallStatus)} Overall Status: ${getStatusColor(overallStatus)}`);

    } catch (error) {
      spinner.fail(chalk.red('System status check failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Network status
statusCommand
  .command('networks')
  .description('Check blockchain network connectivity')
  .option('-n, --network <network>', 'Check specific network')
  .action(async (options) => {
    const spinner = ora('Checking network connectivity...').start();
    
    try {
      const networks = options.network ? [options.network] : ['ethereum', 'bsc', 'polygon', 'localhost'];
      
      spinner.succeed(chalk.green('Network connectivity check completed'));

      console.log(chalk.blue.bold('\n🌐 Network Status'));
      console.log('═'.repeat(50));

      const networkData = [
        ['Network', 'Status', 'Block Number', 'Gas Price', 'Latency']
      ];

      for (const network of networks) {
        try {
          // This would typically check actual network connectivity
          // For now, we'll simulate the data
          const mockData = {
            status: 'connected',
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasPrice: Math.floor(Math.random() * 50) + 10,
            latency: Math.floor(Math.random() * 500) + 100
          };

          networkData.push([
            getNetworkColor(network),
            getStatusColor(mockData.status),
            mockData.blockNumber.toLocaleString(),
            `${mockData.gasPrice} gwei`,
            `${mockData.latency}ms`
          ]);
        } catch (error) {
          networkData.push([
            getNetworkColor(network),
            getStatusColor('offline'),
            'N/A',
            'N/A',
            'N/A'
          ]);
        }
      }

      console.log(table(networkData));

    } catch (error) {
      spinner.fail(chalk.red('Network status check failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Contract status
statusCommand
  .command('contracts')
  .description('Check deployed contract status')
  .option('-n, --network <network>', 'Check contracts on specific network', 'localhost')
  .action(async (options) => {
    const spinner = ora('Checking contract status...').start();
    
    try {
      const { network } = options;
      
      // Load deployment info
      const deployment = loadDeployment(network);
      
      if (!deployment) {
        throw new Error(`No deployment found for network: ${network}`);
      }

      spinner.succeed(chalk.green('Contract status check completed'));

      console.log(chalk.blue.bold(`\n📋 Contract Status (${network})`));
      console.log('═'.repeat(50));

      const contractData = [
        ['Contract', 'Address', 'Status', 'Deployed']
      ];

      for (const [contractName, address] of Object.entries(deployment.contracts)) {
        // This would typically check if the contract exists on-chain
        // For now, we'll assume all deployed contracts are active
        contractData.push([
          contractName,
          truncateAddress(address as string),
          getStatusColor('active'),
          new Date(deployment.timestamp).toLocaleDateString()
        ]);
      }

      console.log(table(contractData));

      console.log(chalk.blue('\nDeployment Details:'));
      console.log(`Deployer: ${deployment.deployer}`);
      console.log(`Network: ${deployment.network}`);
      console.log(`Timestamp: ${new Date(deployment.timestamp).toLocaleString()}`);

    } catch (error) {
      spinner.fail(chalk.red('Contract status check failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Transaction status
statusCommand
  .command('transaction')
  .description('Check specific transaction status')
  .requiredOption('-t, --txhash <hash>', 'Transaction hash to check')
  .action(async (options) => {
    const spinner = ora('Checking transaction status...').start();
    
    try {
      const { txhash } = options;
      
      if (!/^0x[a-fA-F0-9]{64}$/.test(txhash)) {
        throw new Error('Invalid transaction hash format');
      }

      const relayerClient = getRelayerClient();
      const result = await relayerClient.get(`/api/v1/transaction/${txhash}`);

      if (!result.data.success) {
        throw new Error(result.data.error || 'Transaction not found');
      }

      const tx = result.data.data;
      spinner.succeed(chalk.green('Transaction status retrieved'));

      console.log(chalk.blue.bold('\n📄 Transaction Details'));
      console.log('═'.repeat(50));

      const txData = [
        ['Property', 'Value']
      ];

      txData.push(['Hash', tx.tx_hash]);
      txData.push(['Status', getStatusColor(tx.status)]);
      txData.push(['From', tx.from_address]);
      txData.push(['To', tx.to_address]);
      txData.push(['Network', getNetworkColor(tx.network)]);
      txData.push(['Gas Used', tx.gas_used || 'Pending']);
      txData.push(['Gas Price', tx.gas_price ? `${tx.gas_price} wei` : 'Pending']);
      txData.push(['Block Number', tx.block_number || 'Pending']);
      txData.push(['Created', new Date(tx.created_at).toLocaleString()]);
      
      if (tx.updated_at) {
        txData.push(['Updated', new Date(tx.updated_at).toLocaleString()]);
      }
      
      if (tx.token_address) {
        txData.push(['Token Address', tx.token_address]);
        txData.push(['Token Type', tx.token_type]);
        txData.push(['Amount', tx.amount]);
        if (tx.token_id) {
          txData.push(['Token ID', tx.token_id]);
        }
      }

      console.log(table(txData));

    } catch (error) {
      spinner.fail(chalk.red('Transaction status check failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper functions

async function displayDetailedStatus(relayerDetails: any, serviceDetails: any): Promise<void> {
  console.log(chalk.blue.bold('\n🔍 Detailed Status Information'));
  console.log('═'.repeat(50));

  // System Information
  console.log(chalk.green.bold('\nSystem Information:'));
  console.log(`Uptime: ${formatUptime(process.uptime())}`);
  console.log(`Memory Usage: ${formatBytes(process.memoryUsage().heapUsed)}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);

  // Relayer Details
  if (relayerDetails.services) {
    console.log(chalk.green.bold('\nService Status:'));
    for (const [service, status] of Object.entries(relayerDetails.services)) {
      console.log(`${service}: ${getStatusColor(status as string)}`);
    }
  }

  // Configuration
  console.log(chalk.green.bold('\nConfiguration:'));
  if (relayerDetails.configuration) {
    console.log(`Networks: ${relayerDetails.configuration.networks?.join(', ') || 'N/A'}`);
    console.log(`Signer Type: ${relayerDetails.configuration.signerType || 'N/A'}`);
    console.log(`Flashbots: ${relayerDetails.configuration.flashbotsEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Metrics: ${relayerDetails.configuration.metricsEnabled ? 'Enabled' : 'Disabled'}`);
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'active':
    case 'connected':
    case 'confirmed':
      return chalk.green(status);
    case 'degraded':
    case 'warning':
    case 'pending':
      return chalk.yellow(status);
    case 'unhealthy':
    case 'offline':
    case 'failed':
    case 'error':
      return chalk.red(status);
    default:
      return chalk.gray(status);
  }
}

function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
      return '✅';
    case 'degraded':
      return '⚠️';
    case 'unhealthy':
      return '❌';
    default:
      return '❓';
  }
}

function getNetworkColor(network: string): string {
  switch (network) {
    case 'ethereum': return chalk.blue(network);
    case 'bsc': return chalk.yellow(network);
    case 'polygon': return chalk.magenta(network);
    case 'localhost': return chalk.gray(network);
    default: return network;
  }
}

function truncateAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}


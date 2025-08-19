import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { loadConfig } from '../utils/config';
import { getRelayerClient } from '../utils/api';

export const watchCommand = new Command('watch')
  .description('Monitor pending transactions and logs');

// Watch pending transactions
watchCommand
  .command('transactions')
  .description('Monitor pending transactions')
  .option('-n, --network <network>', 'Filter by network')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '10')
  .option('--limit <number>', 'Maximum transactions to display', '20')
  .action(async (options) => {
    const { network, interval, limit } = options;
    const refreshInterval = parseInt(interval) * 1000;
    const maxTransactions = parseInt(limit);
    
    console.log(chalk.blue.bold('🔍 Monitoring Pending Transactions'));
    console.log(chalk.gray(`Refresh interval: ${interval}s | Limit: ${maxTransactions}`));
    if (network) {
      console.log(chalk.gray(`Network filter: ${network}`));
    }
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      isRunning = false;
      console.log(chalk.yellow('\n👋 Stopping transaction monitor...'));
      process.exit(0);
    });

    while (isRunning) {
      try {
        await displayPendingTransactions(network, maxTransactions);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      } catch (error) {
        console.error(chalk.red('Error monitoring transactions:'), error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
    }
  });

// Watch relayer logs
watchCommand
  .command('logs')
  .description('Monitor relayer logs')
  .option('-l, --level <level>', 'Log level filter (error, warn, info, debug)', 'info')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '5')
  .option('--lines <number>', 'Number of log lines to display', '50')
  .action(async (options) => {
    const { level, interval, lines } = options;
    const refreshInterval = parseInt(interval) * 1000;
    const maxLines = parseInt(lines);
    
    console.log(chalk.blue.bold('📋 Monitoring Relayer Logs'));
    console.log(chalk.gray(`Level: ${level} | Refresh: ${interval}s | Lines: ${maxLines}`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      isRunning = false;
      console.log(chalk.yellow('\n👋 Stopping log monitor...'));
      process.exit(0);
    });

    while (isRunning) {
      try {
        await displayRelayerLogs(level, maxLines);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      } catch (error) {
        console.error(chalk.red('Error monitoring logs:'), error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
    }
  });

// Watch metrics
watchCommand
  .command('metrics')
  .description('Monitor relayer metrics')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '15')
  .option('--format <format>', 'Display format (table, json)', 'table')
  .action(async (options) => {
    const { interval, format } = options;
    const refreshInterval = parseInt(interval) * 1000;
    
    console.log(chalk.blue.bold('📊 Monitoring Relayer Metrics'));
    console.log(chalk.gray(`Refresh interval: ${interval}s | Format: ${format}`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      isRunning = false;
      console.log(chalk.yellow('\n👋 Stopping metrics monitor...'));
      process.exit(0);
    });

    while (isRunning) {
      try {
        await displayMetrics(format);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      } catch (error) {
        console.error(chalk.red('Error monitoring metrics:'), error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
    }
  });

// Watch gas prices
watchCommand
  .command('gas')
  .description('Monitor gas prices across networks')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds', '30')
  .action(async (options) => {
    const { interval } = options;
    const refreshInterval = parseInt(interval) * 1000;
    
    console.log(chalk.blue.bold('⛽ Monitoring Gas Prices'));
    console.log(chalk.gray(`Refresh interval: ${interval}s`));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    let isRunning = true;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      isRunning = false;
      console.log(chalk.yellow('\n👋 Stopping gas price monitor...'));
      process.exit(0);
    });

    while (isRunning) {
      try {
        await displayGasPrices();
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      } catch (error) {
        console.error(chalk.red('Error monitoring gas prices:'), error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
    }
  });

// Helper functions

async function displayPendingTransactions(network?: string, limit = 20): Promise<void> {
  try {
    const relayerClient = getRelayerClient();
    
    // This would typically call an API endpoint that returns pending transactions
    // For now, we'll simulate the data structure
    const mockTransactions = [
      {
        tx_hash: '0x1234...5678',
        from_address: '0xabcd...efgh',
        to_address: '0x9876...5432',
        network: 'ethereum',
        status: 'pending',
        created_at: new Date().toISOString(),
        token_type: 'ERC20',
        amount: '1000000000000000000'
      }
    ];

    // Clear screen and display header
    console.clear();
    console.log(chalk.blue.bold('🔍 Pending Transactions'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

    if (mockTransactions.length === 0) {
      console.log(chalk.yellow('No pending transactions'));
      return;
    }

    // Create table data
    const tableData = [
      ['Hash', 'From', 'To', 'Network', 'Type', 'Amount', 'Age']
    ];

    for (const tx of mockTransactions.slice(0, limit)) {
      const age = getTimeAgo(new Date(tx.created_at));
      const amount = tx.token_type === 'native' ? 
        `${parseFloat(tx.amount) / 1e18} ETH` : 
        `${parseFloat(tx.amount) / 1e18} ${tx.token_type}`;

      tableData.push([
        truncateHash(tx.tx_hash),
        truncateAddress(tx.from_address),
        truncateAddress(tx.to_address),
        getNetworkColor(tx.network),
        getTokenTypeColor(tx.token_type),
        amount,
        chalk.gray(age)
      ]);
    }

    console.log(table(tableData, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼'
      }
    }));

  } catch (error) {
    console.error(chalk.red('Failed to fetch pending transactions'));
  }
}

async function displayRelayerLogs(level: string, maxLines: number): Promise<void> {
  try {
    // This would typically call an API endpoint that returns recent logs
    // For now, we'll simulate log data
    const mockLogs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Transaction relayed successfully',
        txHash: '0x1234...5678'
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        level: 'warn',
        message: 'High gas price detected',
        network: 'ethereum'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'error',
        message: 'Policy violation: address not in allowlist',
        address: '0xabcd...efgh'
      }
    ];

    // Clear screen and display header
    console.clear();
    console.log(chalk.blue.bold('📋 Relayer Logs'));
    console.log(chalk.gray(`Level: ${level} | Last updated: ${new Date().toLocaleTimeString()}\n`));

    const filteredLogs = mockLogs.filter(log => {
      const levels = ['error', 'warn', 'info', 'debug'];
      const targetIndex = levels.indexOf(level);
      const logIndex = levels.indexOf(log.level);
      return logIndex <= targetIndex;
    }).slice(0, maxLines);

    if (filteredLogs.length === 0) {
      console.log(chalk.yellow(`No ${level} logs found`));
      return;
    }

    for (const log of filteredLogs) {
      const timestamp = chalk.gray(new Date(log.timestamp).toLocaleTimeString());
      const levelColor = getLevelColor(log.level);
      const message = log.message;
      
      console.log(`${timestamp} ${levelColor} ${message}`);
      
      // Display additional context if available
      if (log.txHash) {
        console.log(chalk.gray(`  └─ TX: ${log.txHash}`));
      }
      if (log.network) {
        console.log(chalk.gray(`  └─ Network: ${log.network}`));
      }
      if (log.address) {
        console.log(chalk.gray(`  └─ Address: ${log.address}`));
      }
    }

  } catch (error) {
    console.error(chalk.red('Failed to fetch logs'));
  }
}

async function displayMetrics(format: string): Promise<void> {
  try {
    const relayerClient = getRelayerClient();
    const result = await relayerClient.get('/api/v1/metrics');

    if (!result.data.success) {
      throw new Error('Failed to fetch metrics');
    }

    const metrics = result.data.data;

    // Clear screen and display header
    console.clear();
    console.log(chalk.blue.bold('📊 Relayer Metrics'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

    if (format === 'json') {
      console.log(JSON.stringify(metrics, null, 2));
      return;
    }

    // Display metrics in table format
    const metricsData = [
      ['Metric', 'Value']
    ];

    // Add system metrics
    metricsData.push(['Uptime', formatUptime(process.uptime())]);
    metricsData.push(['Memory Usage', formatBytes(process.memoryUsage().heapUsed)]);
    
    // Add transaction metrics (mock data)
    metricsData.push(['Total Transactions', '1,234']);
    metricsData.push(['Successful', chalk.green('1,200')]);
    metricsData.push(['Failed', chalk.red('34')]);
    metricsData.push(['Success Rate', '97.2%']);

    console.log(table(metricsData));

  } catch (error) {
    console.error(chalk.red('Failed to fetch metrics'));
  }
}

async function displayGasPrices(): Promise<void> {
  try {
    const networks = ['ethereum', 'bsc', 'polygon'];
    
    // Clear screen and display header
    console.clear();
    console.log(chalk.blue.bold('⛽ Gas Prices'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

    const gasData = [
      ['Network', 'Slow', 'Standard', 'Fast']
    ];

    for (const network of networks) {
      try {
        // This would typically call the gas price API endpoint
        // For now, we'll use mock data
        const mockPrices = {
          slow: Math.floor(Math.random() * 20) + 10,
          standard: Math.floor(Math.random() * 30) + 20,
          fast: Math.floor(Math.random() * 40) + 30
        };

        gasData.push([
          getNetworkColor(network),
          `${mockPrices.slow} gwei`,
          `${mockPrices.standard} gwei`,
          `${mockPrices.fast} gwei`
        ]);
      } catch (error) {
        gasData.push([
          getNetworkColor(network),
          chalk.red('Error'),
          chalk.red('Error'),
          chalk.red('Error')
        ]);
      }
    }

    console.log(table(gasData));

  } catch (error) {
    console.error(chalk.red('Failed to fetch gas prices'));
  }
}

// Utility functions

function truncateHash(hash: string): string {
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
}

function truncateAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
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

function getTokenTypeColor(tokenType: string): string {
  switch (tokenType) {
    case 'native': return chalk.green(tokenType);
    case 'ERC20': return chalk.blue(tokenType);
    case 'ERC721': return chalk.purple(tokenType);
    case 'ERC1155': return chalk.cyan(tokenType);
    default: return tokenType;
  }
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'error': return chalk.red.bold('[ERROR]');
    case 'warn': return chalk.yellow.bold('[WARN]');
    case 'info': return chalk.blue.bold('[INFO]');
    case 'debug': return chalk.gray.bold('[DEBUG]');
    default: return `[${level.toUpperCase()}]`;
  }
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


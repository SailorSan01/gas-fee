import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ethers } from 'ethers';
import fs from 'fs';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import { loadConfig } from '../utils/config';
import { getRelayerClient } from '../utils/api';

interface SponsorRequest {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  data: string;
  signature: string;
  network: string;
  tokenAddress?: string;
  tokenType?: 'ERC20' | 'ERC721' | 'ERC1155';
  amount?: string;
  tokenId?: string;
}

export const sponsorCommand = new Command('sponsor')
  .description('Sponsor transactions');

// Single transaction sponsoring
sponsorCommand
  .command('withdraw')
  .description('Manually sponsor a single withdrawal transaction')
  .option('-n, --network <network>', 'Network to use', 'localhost')
  .option('-f, --from <address>', 'From address')
  .option('-t, --to <address>', 'To address (contract)')
  .option('-v, --value <value>', 'ETH value in wei', '0')
  .option('-g, --gas <gas>', 'Gas limit', '100000')
  .option('-d, --data <data>', 'Transaction data', '0x')
  .option('--token-address <address>', 'Token contract address')
  .option('--token-type <type>', 'Token type (ERC20, ERC721, ERC1155)')
  .option('--amount <amount>', 'Token amount')
  .option('--token-id <id>', 'Token ID (for ERC721/ERC1155)')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    const spinner = ora('Preparing transaction sponsoring...').start();
    
    try {
      const config = loadConfig();
      let sponsorRequest: Partial<SponsorRequest> = { ...options };

      if (options.interactive) {
        spinner.stop();
        sponsorRequest = await promptForTransactionDetails(sponsorRequest);
        spinner.start('Processing transaction...');
      }

      // Validate required fields
      if (!sponsorRequest.from || !sponsorRequest.to || !sponsorRequest.network) {
        throw new Error('Missing required fields: from, to, network');
      }

      // Create meta-transaction signature (simplified for demo)
      const signature = await createMetaTransactionSignature(sponsorRequest as SponsorRequest);
      sponsorRequest.signature = signature;

      spinner.text = 'Submitting transaction to relayer...';
      
      const relayerClient = getRelayerClient();
      const result = await relayerClient.post('/api/v1/relay', sponsorRequest);

      if (result.data.success) {
        spinner.succeed(chalk.green('Transaction sponsored successfully!'));
        console.log(chalk.blue('\nTransaction Details:'));
        console.log(`Transaction Hash: ${chalk.green(result.data.data.txHash)}`);
        console.log(`Gas Used: ${chalk.yellow(result.data.data.gasUsed || 'Pending')}`);
        console.log(`Gas Price: ${chalk.yellow(result.data.data.gasPrice)} wei`);
        
        // Monitor transaction status
        await monitorTransaction(result.data.data.txHash);
      } else {
        throw new Error(result.data.error || 'Transaction sponsoring failed');
      }

    } catch (error) {
      spinner.fail(chalk.red('Transaction sponsoring failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Batch transaction sponsoring
sponsorCommand
  .command('batch')
  .description('Sponsor multiple transactions from CSV file')
  .requiredOption('-f, --file <path>', 'CSV file path')
  .option('-o, --output <path>', 'Output file for results', 'sponsor-results.csv')
  .option('--dry-run', 'Validate CSV without sponsoring')
  .option('--delay <ms>', 'Delay between transactions in ms', '1000')
  .action(async (options) => {
    const spinner = ora('Loading CSV file...').start();
    
    try {
      const { file, output, dryRun, delay } = options;
      
      if (!fs.existsSync(file)) {
        throw new Error(`CSV file not found: ${file}`);
      }

      // Parse CSV file
      const transactions: any[] = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(file)
          .pipe(csv())
          .on('data', (row) => transactions.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      spinner.text = `Loaded ${transactions.length} transactions`;
      
      if (transactions.length === 0) {
        throw new Error('No transactions found in CSV file');
      }

      // Validate CSV format
      const requiredFields = ['from', 'to', 'network'];
      const firstRow = transactions[0];
      const missingFields = requiredFields.filter(field => !(field in firstRow));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required CSV columns: ${missingFields.join(', ')}`);
      }

      if (dryRun) {
        spinner.succeed(chalk.yellow('CSV validation completed (dry run)'));
        console.log(chalk.blue(`✓ Found ${transactions.length} valid transactions`));
        return;
      }

      // Process transactions
      const results: any[] = [];
      const relayerClient = getRelayerClient();
      
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        spinner.text = `Processing transaction ${i + 1}/${transactions.length}`;
        
        try {
          // Create signature for the transaction
          const signature = await createMetaTransactionSignature(tx);
          tx.signature = signature;
          
          // Submit to relayer
          const result = await relayerClient.post('/api/v1/relay', tx);
          
          results.push({
            index: i + 1,
            from: tx.from,
            to: tx.to,
            network: tx.network,
            status: result.data.success ? 'success' : 'failed',
            txHash: result.data.data?.txHash || '',
            error: result.data.error || ''
          });

          if (result.data.success) {
            console.log(chalk.green(`✓ Transaction ${i + 1} sponsored: ${result.data.data.txHash}`));
          } else {
            console.log(chalk.red(`✗ Transaction ${i + 1} failed: ${result.data.error}`));
          }

          // Delay between transactions
          if (i < transactions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
          }

        } catch (error) {
          results.push({
            index: i + 1,
            from: tx.from,
            to: tx.to,
            network: tx.network,
            status: 'error',
            txHash: '',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.log(chalk.red(`✗ Transaction ${i + 1} error: ${error instanceof Error ? error.message : error}`));
        }
      }

      // Save results to CSV
      const csvWriter = createObjectCsvWriter({
        path: output,
        header: [
          { id: 'index', title: 'Index' },
          { id: 'from', title: 'From' },
          { id: 'to', title: 'To' },
          { id: 'network', title: 'Network' },
          { id: 'status', title: 'Status' },
          { id: 'txHash', title: 'Transaction Hash' },
          { id: 'error', title: 'Error' }
        ]
      });

      await csvWriter.writeRecords(results);
      
      spinner.succeed(chalk.green('Batch sponsoring completed!'));
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status !== 'success').length;
      
      console.log(chalk.blue('\nBatch Summary:'));
      console.log(`Total: ${transactions.length}`);
      console.log(`Successful: ${chalk.green(successful)}`);
      console.log(`Failed: ${chalk.red(failed)}`);
      console.log(`Results saved to: ${chalk.blue(output)}`);

    } catch (error) {
      spinner.fail(chalk.red('Batch sponsoring failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper functions

async function promptForTransactionDetails(initial: Partial<SponsorRequest>): Promise<SponsorRequest> {
  const questions = [
    {
      type: 'input',
      name: 'from',
      message: 'From address:',
      default: initial.from,
      validate: (input: string) => ethers.isAddress(input) || 'Invalid Ethereum address'
    },
    {
      type: 'input',
      name: 'to',
      message: 'To address (contract):',
      default: initial.to,
      validate: (input: string) => ethers.isAddress(input) || 'Invalid Ethereum address'
    },
    {
      type: 'list',
      name: 'network',
      message: 'Network:',
      choices: ['localhost', 'ethereum', 'bsc', 'polygon'],
      default: initial.network || 'localhost'
    },
    {
      type: 'input',
      name: 'value',
      message: 'ETH value (in wei):',
      default: initial.value || '0',
      validate: (input: string) => /^\d+$/.test(input) || 'Must be a valid number'
    },
    {
      type: 'input',
      name: 'gas',
      message: 'Gas limit:',
      default: initial.gas || '100000',
      validate: (input: string) => /^\d+$/.test(input) || 'Must be a valid number'
    },
    {
      type: 'input',
      name: 'data',
      message: 'Transaction data:',
      default: initial.data || '0x'
    },
    {
      type: 'confirm',
      name: 'hasToken',
      message: 'Is this a token transaction?',
      default: false
    }
  ];

  const answers = await inquirer.prompt(questions);

  if (answers.hasToken) {
    const tokenQuestions = [
      {
        type: 'input',
        name: 'tokenAddress',
        message: 'Token contract address:',
        validate: (input: string) => ethers.isAddress(input) || 'Invalid Ethereum address'
      },
      {
        type: 'list',
        name: 'tokenType',
        message: 'Token type:',
        choices: ['ERC20', 'ERC721', 'ERC1155']
      },
      {
        type: 'input',
        name: 'amount',
        message: 'Token amount:',
        validate: (input: string) => /^\d+$/.test(input) || 'Must be a valid number'
      }
    ];

    const tokenAnswers = await inquirer.prompt(tokenQuestions);
    Object.assign(answers, tokenAnswers);

    if (tokenAnswers.tokenType === 'ERC721' || tokenAnswers.tokenType === 'ERC1155') {
      const tokenIdAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'tokenId',
          message: 'Token ID:',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a valid number'
        }
      ]);
      answers.tokenId = tokenIdAnswer.tokenId;
    }
  }

  delete answers.hasToken;
  return answers as SponsorRequest;
}

async function createMetaTransactionSignature(request: SponsorRequest): Promise<string> {
  // This is a simplified signature creation for demo purposes
  // In a real implementation, this would:
  // 1. Get the user's private key securely
  // 2. Create the proper EIP-712 signature
  // 3. Handle nonce management
  
  // For demo, return a mock signature
  const mockSignature = '0x' + '0'.repeat(130); // 65 bytes = 130 hex chars
  
  // Set default values
  request.nonce = request.nonce || '0';
  request.value = request.value || '0';
  request.gas = request.gas || '100000';
  request.data = request.data || '0x';
  
  return mockSignature;
}

async function monitorTransaction(txHash: string): Promise<void> {
  const spinner = ora('Monitoring transaction status...').start();
  
  try {
    const relayerClient = getRelayerClient();
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    
    while (attempts < maxAttempts) {
      try {
        const result = await relayerClient.get(`/api/v1/transaction/${txHash}`);
        
        if (result.data.success && result.data.data) {
          const tx = result.data.data;
          
          if (tx.status === 'confirmed') {
            spinner.succeed(chalk.green('Transaction confirmed!'));
            console.log(`Block Number: ${chalk.blue(tx.block_number)}`);
            console.log(`Gas Used: ${chalk.yellow(tx.gas_used)}`);
            return;
          } else if (tx.status === 'failed') {
            spinner.fail(chalk.red('Transaction failed!'));
            return;
          }
          
          spinner.text = `Transaction status: ${tx.status} (attempt ${attempts + 1}/${maxAttempts})`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempts++;
        
      } catch (error) {
        // Continue monitoring even if individual requests fail
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    spinner.warn(chalk.yellow('Transaction monitoring timeout - check status manually'));
    
  } catch (error) {
    spinner.fail(chalk.red('Transaction monitoring failed'));
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}


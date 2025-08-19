import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import yaml from 'yaml';
import { table } from 'table';
import { loadConfig } from '../utils/config';
import { getRelayerClient } from '../utils/api';

interface PolicyRule {
  id?: number;
  rule_type: 'allowlist' | 'quota' | 'gas_limit' | 'token_limit';
  target: string;
  value: any;
  enabled: boolean;
}

export const policyCommand = new Command('policy')
  .description('Manage policy rules');

// Set policy rules from YAML file
policyCommand
  .command('set')
  .description('Load and update policy rules from YAML file')
  .requiredOption('-f, --file <path>', 'YAML policy file path')
  .option('--dry-run', 'Validate YAML without applying changes')
  .action(async (options) => {
    const spinner = ora('Loading policy file...').start();
    
    try {
      const { file, dryRun } = options;
      
      if (!fs.existsSync(file)) {
        throw new Error(`Policy file not found: ${file}`);
      }

      // Load and parse YAML file
      const yamlContent = fs.readFileSync(file, 'utf8');
      const policyConfig = yaml.parse(yamlContent);
      
      // Validate policy structure
      validatePolicyConfig(policyConfig);
      
      spinner.text = 'Converting policy rules...';
      
      // Convert YAML config to policy rules
      const rules = convertConfigToRules(policyConfig);
      
      if (dryRun) {
        spinner.succeed(chalk.yellow('Policy validation completed (dry run)'));
        console.log(chalk.blue(`✓ Found ${rules.length} valid policy rules`));
        displayPolicyRules(rules);
        return;
      }

      spinner.text = 'Applying policy rules...';
      
      // Apply rules via API
      const relayerClient = getRelayerClient();
      const results = [];
      
      for (const rule of rules) {
        try {
          const result = await relayerClient.post('/api/v1/policy/rules', rule);
          results.push({ rule: rule.rule_type, target: rule.target, status: 'success' });
        } catch (error) {
          results.push({ 
            rule: rule.rule_type, 
            target: rule.target, 
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      spinner.succeed(chalk.green('Policy rules applied!'));
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      console.log(chalk.blue('\nPolicy Update Summary:'));
      console.log(`Total rules: ${rules.length}`);
      console.log(`Applied: ${chalk.green(successful)}`);
      console.log(`Failed: ${chalk.red(failed)}`);
      
      if (failed > 0) {
        console.log(chalk.red('\nFailed rules:'));
        results.filter(r => r.status === 'failed').forEach(r => {
          console.log(`- ${r.rule} (${r.target}): ${r.error}`);
        });
      }

    } catch (error) {
      spinner.fail(chalk.red('Policy update failed'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List current policy rules
policyCommand
  .command('list')
  .description('List current policy rules')
  .option('-t, --type <type>', 'Filter by rule type')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    const spinner = ora('Fetching policy rules...').start();
    
    try {
      const relayerClient = getRelayerClient();
      const result = await relayerClient.get('/api/v1/policy/rules', {
        params: options.type ? { type: options.type } : {}
      });

      if (!result.data.success) {
        throw new Error(result.data.error || 'Failed to fetch policy rules');
      }

      const rules = result.data.data || [];
      spinner.succeed(chalk.green(`Found ${rules.length} policy rules`));

      if (rules.length === 0) {
        console.log(chalk.yellow('No policy rules found'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(rules, null, 2));
      } else {
        displayPolicyRulesTable(rules);
      }

    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch policy rules'));
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add a single policy rule interactively
policyCommand
  .command('add')
  .description('Add a policy rule interactively')
  .action(async () => {
    try {
      console.log(chalk.blue('Adding a new policy rule...\n'));
      
      const rule = await promptForPolicyRule();
      
      const spinner = ora('Adding policy rule...').start();
      
      const relayerClient = getRelayerClient();
      const result = await relayerClient.post('/api/v1/policy/rules', rule);

      if (result.data.success) {
        spinner.succeed(chalk.green('Policy rule added successfully!'));
        console.log(chalk.blue('\nRule Details:'));
        console.log(`Type: ${rule.rule_type}`);
        console.log(`Target: ${rule.target}`);
        console.log(`Enabled: ${rule.enabled}`);
      } else {
        throw new Error(result.data.error || 'Failed to add policy rule');
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Remove a policy rule
policyCommand
  .command('remove')
  .description('Remove a policy rule by ID')
  .requiredOption('-i, --id <id>', 'Rule ID to remove')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    try {
      const { id, force } = options;
      
      if (!force) {
        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: `Are you sure you want to remove policy rule ${id}?`,
            default: false
          }
        ]);
        
        if (!confirm.proceed) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }

      const spinner = ora('Removing policy rule...').start();
      
      const relayerClient = getRelayerClient();
      const result = await relayerClient.delete(`/api/v1/policy/rules/${id}`);

      if (result.data.success) {
        spinner.succeed(chalk.green('Policy rule removed successfully!'));
      } else {
        throw new Error(result.data.error || 'Failed to remove policy rule');
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Generate example policy file
policyCommand
  .command('example')
  .description('Generate an example policy YAML file')
  .option('-o, --output <path>', 'Output file path', 'policy-example.yaml')
  .action(async (options) => {
    const examplePolicy = {
      allowlist: {
        global: {
          addresses: [
            '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1',
            '0x8ba1f109551bD432803012645Hac136c4c4b4d8b1'
          ]
        },
        ethereum: {
          addresses: [
            '0x1234567890123456789012345678901234567890'
          ]
        }
      },
      quotas: {
        global: {
          maxTransactionsPerHour: 100,
          maxTransactionsPerDay: 1000,
          maxValuePerTransaction: '1000000000000000000', // 1 ETH
          maxValuePerHour: '10000000000000000000',       // 10 ETH
          maxValuePerDay: '100000000000000000000'        // 100 ETH
        },
        '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1': {
          maxTransactionsPerHour: 50,
          maxTransactionsPerDay: 500,
          maxValuePerTransaction: '500000000000000000',  // 0.5 ETH
          maxValuePerHour: '5000000000000000000',        // 5 ETH
          maxValuePerDay: '50000000000000000000'         // 50 ETH
        }
      },
      gasLimits: {
        global: {
          maxGasLimit: '500000',
          maxGasPrice: '100000000000' // 100 gwei
        },
        ethereum: {
          maxGasLimit: '1000000',
          maxGasPrice: '200000000000' // 200 gwei
        }
      },
      tokenLimits: {
        global: {
          allowedTokens: [
            '0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C', // Example USDC
            '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // Example USDT
          ],
          maxAmountPerTransaction: {
            '0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C': '1000000000', // 1000 USDC
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': '1000000000'  // 1000 USDT
          },
          maxAmountPerHour: {
            '0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C': '10000000000', // 10000 USDC
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': '10000000000'  // 10000 USDT
          },
          maxAmountPerDay: {
            '0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C': '100000000000', // 100000 USDC
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': '100000000000'  // 100000 USDT
          }
        }
      }
    };

    try {
      const yamlContent = yaml.stringify(examplePolicy, { indent: 2 });
      fs.writeFileSync(options.output, yamlContent);
      
      console.log(chalk.green(`✓ Example policy file created: ${options.output}`));
      console.log(chalk.blue('\nEdit this file and use "relayer-cli policy set -f <file>" to apply'));
      
    } catch (error) {
      console.error(chalk.red('Error creating example file:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper functions

function validatePolicyConfig(config: any): void {
  const validSections = ['allowlist', 'quotas', 'gasLimits', 'tokenLimits'];
  
  for (const section of Object.keys(config)) {
    if (!validSections.includes(section)) {
      throw new Error(`Invalid policy section: ${section}`);
    }
  }
  
  // Additional validation logic can be added here
}

function convertConfigToRules(config: any): PolicyRule[] {
  const rules: PolicyRule[] = [];
  
  // Convert allowlist rules
  if (config.allowlist) {
    for (const [target, value] of Object.entries(config.allowlist)) {
      rules.push({
        rule_type: 'allowlist',
        target: target === 'global' ? '*' : target,
        value: JSON.stringify(value),
        enabled: true
      });
    }
  }
  
  // Convert quota rules
  if (config.quotas) {
    for (const [target, value] of Object.entries(config.quotas)) {
      rules.push({
        rule_type: 'quota',
        target: target === 'global' ? '*' : target,
        value: JSON.stringify(value),
        enabled: true
      });
    }
  }
  
  // Convert gas limit rules
  if (config.gasLimits) {
    for (const [target, value] of Object.entries(config.gasLimits)) {
      rules.push({
        rule_type: 'gas_limit',
        target: target === 'global' ? '*' : target,
        value: JSON.stringify(value),
        enabled: true
      });
    }
  }
  
  // Convert token limit rules
  if (config.tokenLimits) {
    for (const [target, value] of Object.entries(config.tokenLimits)) {
      rules.push({
        rule_type: 'token_limit',
        target: target === 'global' ? '*' : target,
        value: JSON.stringify(value),
        enabled: true
      });
    }
  }
  
  return rules;
}

function displayPolicyRules(rules: PolicyRule[]): void {
  console.log(chalk.blue('\nPolicy Rules:'));
  
  for (const rule of rules) {
    console.log(`\n${chalk.green('●')} ${chalk.bold(rule.rule_type.toUpperCase())}`);
    console.log(`  Target: ${rule.target}`);
    console.log(`  Enabled: ${rule.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Value: ${JSON.stringify(JSON.parse(rule.value), null, 2)}`);
  }
}

function displayPolicyRulesTable(rules: PolicyRule[]): void {
  const data = [
    ['ID', 'Type', 'Target', 'Enabled', 'Value Preview']
  ];
  
  for (const rule of rules) {
    const valuePreview = JSON.stringify(JSON.parse(rule.value)).substring(0, 50) + '...';
    data.push([
      rule.id?.toString() || 'N/A',
      rule.rule_type,
      rule.target,
      rule.enabled ? chalk.green('Yes') : chalk.red('No'),
      valuePreview
    ]);
  }
  
  console.log(table(data));
}

async function promptForPolicyRule(): Promise<PolicyRule> {
  const questions = [
    {
      type: 'list',
      name: 'rule_type',
      message: 'Rule type:',
      choices: [
        { name: 'Allowlist', value: 'allowlist' },
        { name: 'Quota', value: 'quota' },
        { name: 'Gas Limit', value: 'gas_limit' },
        { name: 'Token Limit', value: 'token_limit' }
      ]
    },
    {
      type: 'input',
      name: 'target',
      message: 'Target (address, network, or * for global):',
      default: '*'
    },
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable this rule?',
      default: true
    }
  ];

  const answers = await inquirer.prompt(questions);
  
  // Get rule-specific configuration
  let value: any = {};
  
  switch (answers.rule_type) {
    case 'allowlist':
      const allowlistAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'addresses',
          message: 'Allowed addresses (comma-separated):',
          filter: (input: string) => input.split(',').map(addr => addr.trim())
        }
      ]);
      value = { addresses: allowlistAnswers.addresses };
      break;
      
    case 'quota':
      const quotaAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'maxTransactionsPerHour',
          message: 'Max transactions per hour:',
          default: '100',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a number'
        },
        {
          type: 'input',
          name: 'maxTransactionsPerDay',
          message: 'Max transactions per day:',
          default: '1000',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a number'
        },
        {
          type: 'input',
          name: 'maxValuePerTransaction',
          message: 'Max value per transaction (wei):',
          default: '1000000000000000000',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a number'
        }
      ]);
      value = {
        maxTransactionsPerHour: parseInt(quotaAnswers.maxTransactionsPerHour),
        maxTransactionsPerDay: parseInt(quotaAnswers.maxTransactionsPerDay),
        maxValuePerTransaction: quotaAnswers.maxValuePerTransaction,
        maxValuePerHour: (BigInt(quotaAnswers.maxValuePerTransaction) * BigInt(quotaAnswers.maxTransactionsPerHour)).toString(),
        maxValuePerDay: (BigInt(quotaAnswers.maxValuePerTransaction) * BigInt(quotaAnswers.maxTransactionsPerDay)).toString()
      };
      break;
      
    case 'gas_limit':
      const gasAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'maxGasLimit',
          message: 'Max gas limit:',
          default: '500000',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a number'
        },
        {
          type: 'input',
          name: 'maxGasPrice',
          message: 'Max gas price (wei):',
          default: '100000000000',
          validate: (input: string) => /^\d+$/.test(input) || 'Must be a number'
        }
      ]);
      value = gasAnswers;
      break;
      
    case 'token_limit':
      const tokenAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'allowedTokens',
          message: 'Allowed token addresses (comma-separated):',
          filter: (input: string) => input.split(',').map(addr => addr.trim())
        }
      ]);
      value = { allowedTokens: tokenAnswers.allowedTokens };
      break;
  }
  
  return {
    rule_type: answers.rule_type,
    target: answers.target,
    value: JSON.stringify(value),
    enabled: answers.enabled
  };
}


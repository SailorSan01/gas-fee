import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { table } from 'table';

export const configCommand = new Command('config')
  .description('Manage CLI configuration');

// Show current configuration
configCommand
  .command('show')
  .description('Show current configuration')
  .option('--format <format>', 'Output format (table, json)', 'table')
  .action(async (options) => {
    try {
      const config = loadCliConfig();
      
      console.log(chalk.blue.bold('⚙️ Current Configuration'));
      console.log('═'.repeat(50));

      if (options.format === 'json') {
        console.log(JSON.stringify(config, null, 2));
        return;
      }

      const configData = [
        ['Setting', 'Value']
      ];

      configData.push(['Relayer URL', config.relayerUrl || 'Not set']);
      configData.push(['Default Network', config.defaultNetwork || 'localhost']);
      configData.push(['API Timeout', `${config.apiTimeout || 30000}ms`]);
      configData.push(['Auto-confirm', config.autoConfirm ? 'Yes' : 'No']);
      configData.push(['Color Output', config.colorOutput !== false ? 'Yes' : 'No']);

      console.log(table(configData));

      const configPath = getConfigPath();
      console.log(chalk.gray(`\nConfig file: ${configPath}`));

    } catch (error) {
      console.error(chalk.red('Error loading configuration:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Set configuration values
configCommand
  .command('set')
  .description('Set configuration values')
  .option('-k, --key <key>', 'Configuration key')
  .option('-v, --value <value>', 'Configuration value')
  .option('--interactive', 'Interactive configuration')
  .action(async (options) => {
    try {
      let config = loadCliConfig();

      if (options.interactive) {
        config = await interactiveConfig(config);
      } else if (options.key && options.value !== undefined) {
        config = setConfigValue(config, options.key, options.value);
      } else {
        console.error(chalk.red('Error: Either use --interactive or provide --key and --value'));
        process.exit(1);
      }

      saveCliConfig(config);
      console.log(chalk.green('✓ Configuration updated successfully'));

    } catch (error) {
      console.error(chalk.red('Error updating configuration:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Reset configuration to defaults
configCommand
  .command('reset')
  .description('Reset configuration to defaults')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    try {
      if (!options.force) {
        const confirm = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'proceed',
            message: 'Are you sure you want to reset configuration to defaults?',
            default: false
          }
        ]);

        if (!confirm.proceed) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }

      const defaultConfig = getDefaultConfig();
      saveCliConfig(defaultConfig);
      
      console.log(chalk.green('✓ Configuration reset to defaults'));

    } catch (error) {
      console.error(chalk.red('Error resetting configuration:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Initialize configuration
configCommand
  .command('init')
  .description('Initialize configuration with guided setup')
  .action(async () => {
    try {
      console.log(chalk.blue.bold('🚀 CLI Configuration Setup'));
      console.log('═'.repeat(50));
      console.log('This will guide you through setting up the CLI configuration.\n');

      const config = await guidedSetup();
      saveCliConfig(config);

      console.log(chalk.green('\n✓ Configuration initialized successfully!'));
      console.log(chalk.blue('\nYou can now use the CLI tools. Try:'));
      console.log('  relayer-cli status system');
      console.log('  relayer-cli deploy --network localhost');

    } catch (error) {
      console.error(chalk.red('Error initializing configuration:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper functions

function getConfigPath(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configDir = path.join(homeDir, '.relayer-cli');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  return path.join(configDir, 'config.json');
}

function getDefaultConfig(): any {
  return {
    relayerUrl: 'http://localhost:3000',
    defaultNetwork: 'localhost',
    apiTimeout: 30000,
    autoConfirm: false,
    colorOutput: true
  };
}

function loadCliConfig(): any {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return getDefaultConfig();
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return { ...getDefaultConfig(), ...JSON.parse(configContent) };
  } catch (error) {
    console.warn(chalk.yellow('Warning: Invalid config file, using defaults'));
    return getDefaultConfig();
  }
}

function saveCliConfig(config: any): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function setConfigValue(config: any, key: string, value: string): any {
  const newConfig = { ...config };
  
  // Handle boolean values
  if (value === 'true') {
    newConfig[key] = true;
  } else if (value === 'false') {
    newConfig[key] = false;
  } else if (/^\d+$/.test(value)) {
    // Handle numeric values
    newConfig[key] = parseInt(value, 10);
  } else {
    newConfig[key] = value;
  }
  
  return newConfig;
}

async function interactiveConfig(currentConfig: any): Promise<any> {
  const questions = [
    {
      type: 'input',
      name: 'relayerUrl',
      message: 'Relayer backend URL:',
      default: currentConfig.relayerUrl,
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'list',
      name: 'defaultNetwork',
      message: 'Default network:',
      choices: ['localhost', 'ethereum', 'bsc', 'polygon'],
      default: currentConfig.defaultNetwork
    },
    {
      type: 'input',
      name: 'apiTimeout',
      message: 'API timeout (milliseconds):',
      default: currentConfig.apiTimeout.toString(),
      validate: (input: string) => {
        const num = parseInt(input, 10);
        return (num > 0 && num <= 300000) || 'Please enter a number between 1 and 300000';
      },
      filter: (input: string) => parseInt(input, 10)
    },
    {
      type: 'confirm',
      name: 'autoConfirm',
      message: 'Auto-confirm destructive operations?',
      default: currentConfig.autoConfirm
    },
    {
      type: 'confirm',
      name: 'colorOutput',
      message: 'Enable colored output?',
      default: currentConfig.colorOutput
    }
  ];

  return await inquirer.prompt(questions);
}

async function guidedSetup(): Promise<any> {
  console.log(chalk.blue('Step 1: Relayer Backend Connection'));
  console.log(chalk.gray('Configure the connection to your relayer backend service.\n'));

  const relayerQuestions = [
    {
      type: 'input',
      name: 'relayerUrl',
      message: 'Relayer backend URL:',
      default: 'http://localhost:3000',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL (e.g., http://localhost:3000)';
        }
      }
    }
  ];

  const relayerConfig = await inquirer.prompt(relayerQuestions);

  console.log(chalk.blue('\nStep 2: Default Settings'));
  console.log(chalk.gray('Configure default settings for CLI operations.\n'));

  const defaultQuestions = [
    {
      type: 'list',
      name: 'defaultNetwork',
      message: 'Default blockchain network:',
      choices: [
        { name: 'Localhost (for development)', value: 'localhost' },
        { name: 'Ethereum Mainnet', value: 'ethereum' },
        { name: 'Binance Smart Chain', value: 'bsc' },
        { name: 'Polygon', value: 'polygon' }
      ],
      default: 'localhost'
    },
    {
      type: 'input',
      name: 'apiTimeout',
      message: 'API request timeout (seconds):',
      default: '30',
      validate: (input: string) => {
        const num = parseInt(input, 10);
        return (num > 0 && num <= 300) || 'Please enter a number between 1 and 300';
      },
      filter: (input: string) => parseInt(input, 10) * 1000 // Convert to milliseconds
    }
  ];

  const defaultConfig = await inquirer.prompt(defaultQuestions);

  console.log(chalk.blue('\nStep 3: User Preferences'));
  console.log(chalk.gray('Configure CLI behavior and output preferences.\n'));

  const preferenceQuestions = [
    {
      type: 'confirm',
      name: 'autoConfirm',
      message: 'Auto-confirm destructive operations (not recommended)?',
      default: false
    },
    {
      type: 'confirm',
      name: 'colorOutput',
      message: 'Enable colored terminal output?',
      default: true
    }
  ];

  const preferences = await inquirer.prompt(preferenceQuestions);

  return {
    ...relayerConfig,
    ...defaultConfig,
    ...preferences
  };
}


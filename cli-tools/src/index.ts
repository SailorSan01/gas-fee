#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { deployCommand } from './commands/deploy';
import { sponsorCommand } from './commands/sponsor';
import { policyCommand } from './commands/policy';
import { watchCommand } from './commands/watch';
import { statusCommand } from './commands/status';
import { configCommand } from './commands/config';

const program = new Command();

// CLI Header
console.log(chalk.blue.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                Gas-Fee Sponsor Relayer CLI                   ║
║                     Version 1.0.0                            ║
╚═══════════════════════════════════════════════════════════════╝
`));

program
  .name('relayer-cli')
  .description('CLI tools for Gas-Fee Sponsor Relayer Bot')
  .version('1.0.0');

// Add commands
program.addCommand(deployCommand);
program.addCommand(sponsorCommand);
program.addCommand(policyCommand);
program.addCommand(watchCommand);
program.addCommand(statusCommand);
program.addCommand(configCommand);

// Global error handler
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}


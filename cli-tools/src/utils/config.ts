import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

export interface Config {
  relayer: {
    url: string;
    timeout: number;
  };
  blockchain: {
    networks: {
      [key: string]: {
        name: string;
        rpcUrl: string;
        chainId: number;
      };
    };
  };
  cli: {
    defaultNetwork: string;
    autoConfirm: boolean;
    colorOutput: boolean;
  };
}

export function loadConfig(): Config {
  return {
    relayer: {
      url: process.env.RELAYER_URL || 'http://localhost:3000',
      timeout: parseInt(process.env.RELAYER_TIMEOUT || '30000', 10)
    },
    blockchain: {
      networks: {
        ethereum: {
          name: 'Ethereum',
          rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
          chainId: 1
        },
        bsc: {
          name: 'Binance Smart Chain',
          rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
          chainId: 56
        },
        polygon: {
          name: 'Polygon',
          rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
          chainId: 137
        },
        localhost: {
          name: 'Localhost',
          rpcUrl: process.env.LOCALHOST_RPC_URL || 'http://localhost:8545',
          chainId: 31337
        }
      }
    },
    cli: {
      defaultNetwork: process.env.DEFAULT_NETWORK || 'localhost',
      autoConfirm: process.env.AUTO_CONFIRM === 'true',
      colorOutput: process.env.COLOR_OUTPUT !== 'false'
    }
  };
}

export function validateConfig(config: Config): void {
  // Validate relayer URL
  try {
    new URL(config.relayer.url);
  } catch {
    throw new Error(`Invalid relayer URL: ${config.relayer.url}`);
  }

  // Validate timeout
  if (config.relayer.timeout <= 0) {
    throw new Error('Relayer timeout must be positive');
  }

  // Validate networks
  for (const [networkName, networkConfig] of Object.entries(config.blockchain.networks)) {
    try {
      new URL(networkConfig.rpcUrl);
    } catch {
      throw new Error(`Invalid RPC URL for ${networkName}: ${networkConfig.rpcUrl}`);
    }

    if (networkConfig.chainId <= 0) {
      throw new Error(`Invalid chain ID for ${networkName}: ${networkConfig.chainId}`);
    }
  }

  // Validate default network
  if (!config.blockchain.networks[config.cli.defaultNetwork]) {
    throw new Error(`Invalid default network: ${config.cli.defaultNetwork}`);
  }
}

export function getNetworkConfig(networkName: string): any {
  const config = loadConfig();
  const network = config.blockchain.networks[networkName];
  
  if (!network) {
    throw new Error(`Unknown network: ${networkName}`);
  }
  
  return network;
}

export function getRelayerConfig(): any {
  const config = loadConfig();
  return config.relayer;
}


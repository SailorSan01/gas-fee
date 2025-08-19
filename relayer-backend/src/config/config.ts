import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'relayer_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10)
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'relayer:'
  },
  
  blockchain: {
    networks: {
      ethereum: {
        name: 'ethereum',
        chainId: 1,
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        contracts: {
          forwarder: process.env.ETHEREUM_FORWARDER_ADDRESS || '',
          withdrawManager: process.env.ETHEREUM_WITHDRAW_MANAGER_ADDRESS || ''
        }
      },
      bsc: {
        name: 'bsc',
        chainId: 56,
        rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org/',
        contracts: {
          forwarder: process.env.BSC_FORWARDER_ADDRESS || '',
          withdrawManager: process.env.BSC_WITHDRAW_MANAGER_ADDRESS || ''
        }
      },
      polygon: {
        name: 'polygon',
        chainId: 137,
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
        contracts: {
          forwarder: process.env.POLYGON_FORWARDER_ADDRESS || '',
          withdrawManager: process.env.POLYGON_WITHDRAW_MANAGER_ADDRESS || ''
        }
      },
      localhost: {
        name: 'localhost',
        chainId: 31337,
        rpcUrl: process.env.LOCALHOST_RPC_URL || 'http://localhost:8545',
        contracts: {
          forwarder: process.env.LOCALHOST_FORWARDER_ADDRESS || '',
          withdrawManager: process.env.LOCALHOST_WITHDRAW_MANAGER_ADDRESS || ''
        }
      }
    }
  },
  
  relayer: {
    // Signer configuration
    signerType: process.env.SIGNER_TYPE || 'local', // 'local' or 'kms'
    privateKey: process.env.RELAYER_PRIVATE_KEY || '', // For local signer
    
    // AWS KMS configuration (if using KMS signer)
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      kmsKeyId: process.env.AWS_KMS_KEY_ID || '',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    
    // Gas configuration
    maxGasPrice: process.env.MAX_GAS_PRICE || '100000000000', // 100 gwei
    maxGasLimit: process.env.MAX_GAS_LIMIT || '500000',
    gasMultiplier: parseFloat(process.env.GAS_MULTIPLIER || '1.2'),
    
    // Policy configuration
    maxTransactionsPerHour: parseInt(process.env.MAX_TX_PER_HOUR || '100', 10),
    maxTransactionsPerDay: parseInt(process.env.MAX_TX_PER_DAY || '1000', 10),
    maxValuePerTransaction: process.env.MAX_VALUE_PER_TX || '1000000000000000000', // 1 ETH
    
    // Flashbots configuration
    flashbots: {
      enabled: process.env.FLASHBOTS_ENABLED === 'true',
      relayUrl: process.env.FLASHBOTS_RELAY_URL || 'https://relay.flashbots.net',
      signerPrivateKey: process.env.FLASHBOTS_SIGNER_PRIVATE_KEY || '',
      maxBaseFeeInFutureBlock: process.env.FLASHBOTS_MAX_BASE_FEE || '300000000000' // 300 gwei
    }
  },
  
  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN || ''
  },
  
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  }
};

// Validation
export function validateConfig(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate signer configuration
  if (config.relayer.signerType === 'local' && !config.relayer.privateKey) {
    throw new Error('RELAYER_PRIVATE_KEY is required when using local signer');
  }

  if (config.relayer.signerType === 'kms' && !config.relayer.aws.kmsKeyId) {
    throw new Error('AWS_KMS_KEY_ID is required when using KMS signer');
  }
}


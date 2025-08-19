# Gas-Fee Sponsor Relayer Bot

A comprehensive cross-chain bridge system that enables gasless transactions by sponsoring gas fees for users across multiple blockchain networks. This system implements meta-transactions using EIP-2771 standard and provides a robust relayer infrastructure for seamless cross-chain operations.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [CLI Tools](#cli-tools)
- [Smart Contracts](#smart-contracts)
- [Monitoring](#monitoring)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Gas-Fee Sponsor Relayer Bot is a production-ready system designed to solve the user experience challenges associated with blockchain transactions. By implementing a meta-transaction pattern, users can interact with smart contracts without holding native tokens for gas fees, significantly lowering the barrier to entry for decentralized applications.

### Key Benefits

- **Gasless Transactions**: Users can perform transactions without holding native tokens
- **Cross-Chain Support**: Supports Ethereum, Binance Smart Chain, Polygon, and local development networks
- **Enterprise-Ready**: Built with production considerations including monitoring, logging, and security
- **Developer-Friendly**: Comprehensive CLI tools and APIs for easy integration
- **Scalable Architecture**: Designed to handle high transaction volumes with proper queuing and rate limiting

### Use Cases

- **DeFi Applications**: Enable users to interact with DeFi protocols without gas fees
- **NFT Marketplaces**: Allow seamless NFT trading without transaction costs
- **Gaming**: Provide frictionless in-game transactions
- **Enterprise Solutions**: Simplify blockchain adoption for businesses
- **Cross-Chain Bridges**: Facilitate asset transfers between different networks

## Architecture

The system consists of four main components working together to provide a seamless gasless transaction experience:

### Component Overview

1. **Smart Contracts**: EIP-2771 compliant contracts for meta-transaction handling
2. **Relayer Backend**: Node.js service that processes and relays transactions
3. **CLI Tools**: Command-line interface for system management and operations
4. **Infrastructure**: Docker-based deployment with monitoring and logging

### Data Flow

```
User → Frontend → Relayer Backend → Smart Contract → Blockchain
  ↓                    ↓                 ↓
Meta-Tx          Policy Check      Gas Payment
Signature        & Validation      & Execution
```

The relayer backend acts as a trusted intermediary that validates user requests, applies policy rules, and submits transactions to the blockchain while paying for gas fees.

## Features

### Core Functionality

- **Meta-Transaction Support**: Full EIP-2771 implementation for gasless transactions
- **Multi-Network Support**: Ethereum, BSC, Polygon, and local development networks
- **Token Support**: Native tokens, ERC-20, ERC-721, and ERC-1155 compatibility
- **Policy Engine**: Configurable rules for transaction validation and rate limiting
- **Nonce Management**: Automatic nonce tracking and collision prevention

### Security Features

- **Signature Verification**: Cryptographic validation of all meta-transactions
- **Rate Limiting**: Configurable limits per address and time period
- **Allowlist Support**: Whitelist-based access control
- **Emergency Controls**: Guardian-based emergency pause functionality
- **Audit Logging**: Comprehensive transaction and security event logging

### Operational Features

- **Health Monitoring**: Built-in health checks and metrics collection
- **Prometheus Integration**: Detailed metrics for monitoring and alerting
- **Grafana Dashboards**: Pre-configured visualization dashboards
- **CLI Management**: Comprehensive command-line tools for operations
- **Docker Deployment**: Container-based deployment with orchestration

### Developer Features

- **REST API**: Complete API for integration with applications
- **SDK Support**: TypeScript/JavaScript SDK for easy integration
- **Test Suite**: Comprehensive test coverage for all components
- **Documentation**: Detailed API documentation and examples
- **Local Development**: Full local development environment with Hardhat

## Quick Start

Get the system running locally in under 5 minutes:

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for development)
- Git

### One-Command Setup

```bash
git clone <repository-url>
cd gas-fee-sponsor-relayer-bot
./scripts/demo.sh
```

This will:
1. Start all services using Docker Compose
2. Deploy smart contracts to local network
3. Initialize the database
4. Run a demo transaction

### Verify Installation

```bash
curl http://localhost:3000/health
```

You should see a healthy status response indicating all services are running correctly.

## Installation

### Development Setup

For local development and testing:

```bash
# Clone the repository
git clone <repository-url>
cd gas-fee-sponsor-relayer-bot

# Run the setup script
./scripts/setup.sh

# Start services
docker-compose up -d

# Deploy contracts
cd contracts
npx hardhat run scripts/deploy.js --network localhost

# Build and start relayer
cd ../relayer-backend
npm run build
npm start
```

### Production Deployment

For production environments:

```bash
# Clone and setup
git clone <repository-url>
cd gas-fee-sponsor-relayer-bot

# Configure environment
cp .env.example .env
# Edit .env with production values

# Deploy with production profile
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Deploy contracts to mainnet
cd contracts
npx hardhat run scripts/deploy.js --network ethereum
```

### Environment Configuration

Key environment variables to configure:

```bash
# Network RPC URLs
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed1.binance.org/
POLYGON_RPC_URL=https://polygon-rpc.com/

# Relayer Configuration
RELAYER_PRIVATE_KEY=0x...
SIGNER_TYPE=local  # or 'kms' for AWS KMS

# Database
DB_HOST=localhost
DB_NAME=relayer_db
DB_USER=postgres
DB_PASSWORD=secure_password

# Security
MAX_TX_PER_HOUR=100
MAX_VALUE_PER_TX=1000000000000000000  # 1 ETH
```



## Configuration

### Smart Contract Configuration

The system uses several smart contracts that need to be deployed and configured:

#### MinimalForwarder Contract

The core contract implementing EIP-2771 meta-transaction functionality. This contract verifies signatures and executes transactions on behalf of users.

**Key Functions:**
- `verify(ForwardRequest req, bytes signature)`: Validates meta-transaction signatures
- `execute(ForwardRequest req, bytes signature)`: Executes verified meta-transactions

**Configuration Parameters:**
- Trusted forwarder addresses for each network
- Domain separator for signature verification
- Nonce tracking for replay protection

#### WithdrawManager Contract

Handles token withdrawals and transfers for various token standards.

**Supported Operations:**
- Native token transfers
- ERC-20 token transfers
- ERC-721 NFT transfers
- ERC-1155 multi-token transfers

**Security Features:**
- Access control for authorized relayers
- Emergency pause functionality
- Rate limiting per token type

#### Guardian Contract

Provides emergency controls and governance functionality.

**Capabilities:**
- Emergency pause/unpause
- Relayer authorization management
- Policy parameter updates
- Multi-signature governance

### Relayer Backend Configuration

The relayer backend is highly configurable through environment variables and configuration files.

#### Database Configuration

PostgreSQL is used for persistent storage of transactions and policy rules:

```javascript
{
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'relayer_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 20
}
```

#### Redis Configuration

Redis is used for caching and nonce management:

```javascript
{
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'relayer:'
}
```

#### Network Configuration

Each supported blockchain network requires specific configuration:

```javascript
{
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
    contracts: {
      forwarder: process.env.ETHEREUM_FORWARDER_ADDRESS,
      withdrawManager: process.env.ETHEREUM_WITHDRAW_MANAGER_ADDRESS
    }
  },
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL,
    chainId: 56,
    contracts: {
      forwarder: process.env.BSC_FORWARDER_ADDRESS,
      withdrawManager: process.env.BSC_WITHDRAW_MANAGER_ADDRESS
    }
  }
}
```

#### Policy Configuration

The policy engine supports various rule types for transaction validation:

**Allowlist Rules:**
```yaml
allowlist:
  global:
    addresses:
      - "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1"
      - "0x8ba1f109551bD432803012645Hac136c4c4b4d8b1"
  ethereum:
    addresses:
      - "0x1234567890123456789012345678901234567890"
```

**Quota Rules:**
```yaml
quotas:
  global:
    maxTransactionsPerHour: 100
    maxTransactionsPerDay: 1000
    maxValuePerTransaction: "1000000000000000000"  # 1 ETH
    maxValuePerHour: "10000000000000000000"        # 10 ETH
    maxValuePerDay: "100000000000000000000"        # 100 ETH
```

**Gas Limit Rules:**
```yaml
gasLimits:
  global:
    maxGasLimit: "500000"
    maxGasPrice: "100000000000"  # 100 gwei
  ethereum:
    maxGasLimit: "1000000"
    maxGasPrice: "200000000000"  # 200 gwei
```

**Token Limit Rules:**
```yaml
tokenLimits:
  global:
    allowedTokens:
      - "0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C"  # USDC
      - "0xdAC17F958D2ee523a2206206994597C13D831ec7"   # USDT
    maxAmountPerTransaction:
      "0xA0b86a33E6441c8C0c4C8C8C8C8C8C8C8C8C8C8C": "1000000000"  # 1000 USDC
```

## Usage

### Basic Transaction Flow

The typical flow for a gasless transaction involves several steps:

1. **User Preparation**: User creates a meta-transaction request with signature
2. **Submission**: Frontend submits the request to the relayer backend
3. **Validation**: Relayer validates signature and applies policy rules
4. **Execution**: Relayer submits transaction to blockchain and pays gas
5. **Confirmation**: Transaction is confirmed and status is updated

### Frontend Integration

To integrate with a frontend application, use the provided SDK:

```javascript
import { RelayerClient } from '@gas-sponsor/sdk';

const client = new RelayerClient('http://localhost:3000');

// Create meta-transaction
const metaTx = {
  from: userAddress,
  to: contractAddress,
  value: '0',
  gas: '100000',
  nonce: await client.getNonce(userAddress),
  data: contractCallData
};

// Sign meta-transaction
const signature = await signer.signTypedData(domain, types, metaTx);

// Submit to relayer
const result = await client.relayTransaction({
  ...metaTx,
  signature,
  network: 'ethereum'
});

console.log('Transaction hash:', result.txHash);
```

### Direct API Usage

For direct API integration without the SDK:

```bash
# Submit meta-transaction
curl -X POST http://localhost:3000/api/v1/relay \
  -H "Content-Type: application/json" \
  -d '{
    "from": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
    "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "value": "1000000000000000000",
    "gas": "21000",
    "nonce": "0",
    "data": "0x",
    "signature": "0x...",
    "network": "ethereum"
  }'

# Check transaction status
curl http://localhost:3000/api/v1/transaction/0x...

# Get supported networks
curl http://localhost:3000/api/v1/networks
```

### CLI Usage

The CLI tools provide comprehensive management capabilities:

```bash
# Deploy contracts
relayer-cli deploy --network ethereum

# Configure policies
relayer-cli policy set --file policy.yaml

# Monitor transactions
relayer-cli watch transactions --network ethereum

# Check system status
relayer-cli status system

# Sponsor transactions from CSV
relayer-cli sponsor batch --file transactions.csv
```

### Token Operations

The system supports various token operations:

**ERC-20 Token Transfer:**
```javascript
const transferData = erc20Interface.encodeFunctionData('transfer', [
  recipientAddress,
  amount
]);

const metaTx = {
  from: userAddress,
  to: tokenAddress,
  value: '0',
  data: transferData,
  // ... other fields
};
```

**ERC-721 NFT Transfer:**
```javascript
const transferData = erc721Interface.encodeFunctionData('safeTransferFrom', [
  fromAddress,
  toAddress,
  tokenId
]);

const metaTx = {
  from: userAddress,
  to: nftAddress,
  value: '0',
  data: transferData,
  tokenType: 'ERC721',
  tokenId: tokenId.toString()
};
```

**ERC-1155 Multi-Token Transfer:**
```javascript
const transferData = erc1155Interface.encodeFunctionData('safeTransferFrom', [
  fromAddress,
  toAddress,
  tokenId,
  amount,
  '0x'
]);

const metaTx = {
  from: userAddress,
  to: multiTokenAddress,
  value: '0',
  data: transferData,
  tokenType: 'ERC1155',
  tokenId: tokenId.toString(),
  amount: amount.toString()
};
```

## API Reference

### REST API Endpoints

The relayer backend provides a comprehensive REST API for integration:

#### Transaction Endpoints

**POST /api/v1/relay**
Submit a meta-transaction for relaying.

Request Body:
```json
{
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
  "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "value": "1000000000000000000",
  "gas": "21000",
  "nonce": "0",
  "data": "0x",
  "signature": "0x...",
  "network": "ethereum",
  "tokenAddress": "0x...",
  "tokenType": "ERC20",
  "amount": "1000000000000000000"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "txHash": "0x...",
    "gasUsed": "21000",
    "gasPrice": "25000000000"
  },
  "message": "Transaction relayed successfully"
}
```

**GET /api/v1/transaction/{txHash}**
Get transaction status and details.

Response:
```json
{
  "success": true,
  "data": {
    "tx_hash": "0x...",
    "status": "confirmed",
    "from_address": "0x...",
    "to_address": "0x...",
    "network": "ethereum",
    "gas_used": "21000",
    "gas_price": "25000000000",
    "block_number": 18500000,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:31:00Z"
  }
}
```

**GET /api/v1/transactions/{address}**
Get transactions for a specific address.

Query Parameters:
- `limit`: Maximum number of transactions to return (default: 100, max: 1000)

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "transactions": [...],
    "total": 150
  }
}
```

#### Network Endpoints

**GET /api/v1/networks**
Get supported networks and their configuration.

Response:
```json
{
  "success": true,
  "data": {
    "ethereum": {
      "name": "Ethereum",
      "chainId": 1,
      "supported": true
    },
    "bsc": {
      "name": "Binance Smart Chain",
      "chainId": 56,
      "supported": true
    }
  }
}
```

**GET /api/v1/gas-price/{network}**
Get current gas price estimates for a network.

Response:
```json
{
  "success": true,
  "data": {
    "network": "ethereum",
    "timestamp": "2024-01-15T10:30:00Z",
    "prices": {
      "slow": "20000000000",
      "standard": "25000000000",
      "fast": "30000000000"
    }
  }
}
```

#### Policy Endpoints

**GET /api/v1/policy/rules**
Get current policy rules.

Query Parameters:
- `type`: Filter by rule type (allowlist, quota, gas_limit, token_limit)

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rule_type": "allowlist",
      "target": "*",
      "value": "{\"addresses\": [...]}",
      "enabled": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**POST /api/v1/policy/rules**
Create a new policy rule.

Request Body:
```json
{
  "rule_type": "quota",
  "target": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
  "value": "{\"maxTransactionsPerHour\": 50}",
  "enabled": true
}
```

#### Monitoring Endpoints

**GET /health**
Basic health check endpoint.

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ethereum": "healthy"
  }
}
```

**GET /metrics**
Prometheus metrics endpoint.

Returns metrics in Prometheus format for monitoring and alerting.

**GET /api/v1/metrics**
JSON metrics endpoint.

Response:
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "transactions": {
      "total": 1234,
      "successful": 1200,
      "failed": 34,
      "pending": 0
    },
    "system": {
      "uptime": 86400,
      "memory": {...},
      "cpu": {...}
    }
  }
}
```

### Error Handling

The API uses standard HTTP status codes and provides detailed error messages:

**400 Bad Request**
```json
{
  "success": false,
  "error": "Validation error: Invalid signature format",
  "code": "VALIDATION_ERROR"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "error": "Address not in allowlist",
  "code": "UNAUTHORIZED"
}
```

**429 Too Many Requests**
```json
{
  "success": false,
  "error": "Rate limit exceeded: 100 transactions per hour",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```


## CLI Tools

The system includes comprehensive command-line tools for deployment, management, and monitoring.

### Installation

```bash
cd cli-tools
npm install
npm run build
npm link  # Makes 'relayer-cli' available globally
```

### Commands Overview

#### Deployment Commands

**deploy**
Deploy smart contracts to specified networks.

```bash
# Deploy to local development network
relayer-cli deploy --network localhost

# Deploy to Ethereum mainnet
relayer-cli deploy --network ethereum --verify

# Deploy specific contracts only
relayer-cli deploy --network polygon --contracts forwarder,withdrawManager

# Deploy with custom gas settings
relayer-cli deploy --network bsc --gas-price 5 --gas-limit 500000
```

Options:
- `--network`: Target network (ethereum, bsc, polygon, localhost)
- `--verify`: Verify contracts on Etherscan after deployment
- `--contracts`: Comma-separated list of contracts to deploy
- `--gas-price`: Gas price in gwei
- `--gas-limit`: Gas limit for deployment transactions
- `--dry-run`: Simulate deployment without executing

#### Sponsorship Commands

**sponsor**
Sponsor individual or batch transactions.

```bash
# Sponsor a single transaction
relayer-cli sponsor transaction \
  --from 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1 \
  --to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --value 1000000000000000000 \
  --network ethereum

# Sponsor transactions from CSV file
relayer-cli sponsor batch --file transactions.csv --network ethereum

# Sponsor with custom gas settings
relayer-cli sponsor transaction \
  --from 0x... --to 0x... --value 1000000000000000000 \
  --gas-price 30 --gas-limit 100000 \
  --network ethereum
```

CSV Format for Batch Operations:
```csv
from,to,value,data,network
0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1,0x70997970C51812dc3A010C7d01b50e0d17dc79C8,1000000000000000000,0x,ethereum
0x8ba1f109551bD432803012645Hac136c4c4b4d8b1,0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,500000000000000000,0x,bsc
```

#### Policy Commands

**policy**
Manage policy rules and configurations.

```bash
# Set policy from YAML file
relayer-cli policy set --file policy.yaml

# Get current policy rules
relayer-cli policy get --type allowlist

# Add address to allowlist
relayer-cli policy allowlist add 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1

# Remove address from allowlist
relayer-cli policy allowlist remove 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1

# Set quota for specific address
relayer-cli policy quota set \
  --address 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1 \
  --max-tx-per-hour 200 \
  --max-value-per-tx 5000000000000000000

# Enable/disable policy rules
relayer-cli policy enable --rule-id 123
relayer-cli policy disable --rule-id 123
```

Policy YAML Format:
```yaml
allowlist:
  global:
    addresses:
      - "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1"
      - "0x8ba1f109551bD432803012645Hac136c4c4b4d8b1"
  ethereum:
    addresses:
      - "0x1234567890123456789012345678901234567890"

quotas:
  global:
    maxTransactionsPerHour: 100
    maxValuePerTransaction: "1000000000000000000"
  "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1":
    maxTransactionsPerHour: 200
    maxValuePerTransaction: "5000000000000000000"

gasLimits:
  global:
    maxGasLimit: "500000"
    maxGasPrice: "100000000000"
  ethereum:
    maxGasLimit: "1000000"
    maxGasPrice: "200000000000"
```

#### Monitoring Commands

**watch**
Monitor transactions and system status in real-time.

```bash
# Watch all transactions
relayer-cli watch transactions

# Watch transactions for specific network
relayer-cli watch transactions --network ethereum

# Watch transactions for specific address
relayer-cli watch transactions --address 0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1

# Watch system metrics
relayer-cli watch metrics

# Watch with filtering
relayer-cli watch transactions --status pending --min-value 1000000000000000000
```

**status**
Check system and component status.

```bash
# Overall system status
relayer-cli status system

# Network-specific status
relayer-cli status network --network ethereum

# Database status
relayer-cli status database

# Redis status
relayer-cli status redis

# Contract status
relayer-cli status contracts --network ethereum
```

#### Configuration Commands

**config**
Manage configuration settings.

```bash
# Show current configuration
relayer-cli config show

# Set configuration values
relayer-cli config set relayer.maxGasPrice 100000000000
relayer-cli config set database.maxConnections 50

# Get specific configuration value
relayer-cli config get relayer.maxGasPrice

# Validate configuration
relayer-cli config validate

# Export configuration to file
relayer-cli config export --file config.json

# Import configuration from file
relayer-cli config import --file config.json
```

### Advanced Usage

#### Custom Scripts

The CLI supports custom JavaScript scripts for advanced operations:

```javascript
// custom-script.js
module.exports = async (cli, args) => {
  const { relayer, database } = cli.services;
  
  // Custom logic here
  const stats = await database.query(`
    SELECT network, COUNT(*) as count 
    FROM transactions 
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY network
  `);
  
  console.log('24h transaction stats:', stats);
};
```

```bash
relayer-cli run --script custom-script.js
```

#### Environment Management

```bash
# Switch between environments
relayer-cli env use production
relayer-cli env use development
relayer-cli env use staging

# List available environments
relayer-cli env list

# Create new environment
relayer-cli env create testing --copy-from development
```

## Smart Contracts

### Contract Architecture

The smart contract system is built around the EIP-2771 meta-transaction standard, providing a secure and efficient way to handle gasless transactions.

#### MinimalForwarder Contract

The core contract implementing meta-transaction functionality.

**Key Features:**
- EIP-2771 compliant implementation
- Signature verification using EIP-712
- Nonce management for replay protection
- Gas-efficient execution

**Contract Interface:**
```solidity
interface IMinimalForwarder {
    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
    }

    function getNonce(address from) external view returns (uint256);
    
    function verify(ForwardRequest calldata req, bytes calldata signature) 
        external view returns (bool);
    
    function execute(ForwardRequest calldata req, bytes calldata signature) 
        external payable returns (bool, bytes memory);
}
```

**Usage Example:**
```solidity
// In your contract, inherit from ERC2771Context
contract MyContract is ERC2771Context {
    constructor(address trustedForwarder) 
        ERC2771Context(trustedForwarder) {}
    
    function someFunction() external {
        address user = _msgSender(); // Gets original sender, not forwarder
        // Your logic here
    }
}
```

#### WithdrawManager Contract

Handles various token operations including withdrawals and transfers.

**Supported Operations:**
- Native ETH transfers
- ERC-20 token transfers
- ERC-721 NFT transfers
- ERC-1155 multi-token transfers
- Batch operations

**Contract Interface:**
```solidity
interface IWithdrawManager {
    function withdrawETH(address to, uint256 amount) external;
    
    function withdrawERC20(address token, address to, uint256 amount) external;
    
    function withdrawERC721(address token, address to, uint256 tokenId) external;
    
    function withdrawERC1155(
        address token, 
        address to, 
        uint256 tokenId, 
        uint256 amount,
        bytes calldata data
    ) external;
    
    function batchWithdraw(
        uint8[] calldata types,
        bytes[] calldata data
    ) external;
}
```

**Security Features:**
- Access control for authorized relayers
- Emergency pause functionality
- Per-token withdrawal limits
- Rate limiting mechanisms

#### Guardian Contract

Provides governance and emergency control functionality.

**Key Features:**
- Multi-signature governance
- Emergency pause/unpause
- Relayer authorization management
- Parameter updates

**Contract Interface:**
```solidity
interface IGuardian {
    function pause() external;
    function unpause() external;
    
    function addRelayer(address relayer) external;
    function removeRelayer(address relayer) external;
    
    function updateParameter(bytes32 key, uint256 value) external;
    
    function emergencyWithdraw(address token, uint256 amount) external;
}
```

#### Paymaster Contract (Experimental)

EIP-4337 Account Abstraction paymaster for advanced use cases.

**Features:**
- EIP-4337 compliant paymaster
- Flexible payment policies
- Token-based fee payment
- Integration with existing relayer infrastructure

**Note:** This is an experimental feature for future Account Abstraction integration.

### Deployment Guide

#### Local Development

```bash
cd contracts
npm install

# Start local Hardhat network
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npx hardhat test

# Generate coverage report
npx hardhat coverage
```

#### Testnet Deployment

```bash
# Configure network in hardhat.config.js
# Deploy to Goerli testnet
npx hardhat run scripts/deploy.js --network goerli

# Verify contracts
npx hardhat verify --network goerli DEPLOYED_ADDRESS

# Run integration tests
npx hardhat test --network goerli
```

#### Mainnet Deployment

```bash
# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.js --network ethereum

# Deploy to BSC mainnet
npx hardhat run scripts/deploy.js --network bsc

# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon

# Verify all contracts
npx hardhat run scripts/verify-all.js --network ethereum
```

### Contract Addresses

#### Ethereum Mainnet
- MinimalForwarder: `0x...` (To be deployed)
- WithdrawManager: `0x...` (To be deployed)
- Guardian: `0x...` (To be deployed)

#### BSC Mainnet
- MinimalForwarder: `0x...` (To be deployed)
- WithdrawManager: `0x...` (To be deployed)
- Guardian: `0x...` (To be deployed)

#### Polygon Mainnet
- MinimalForwarder: `0x...` (To be deployed)
- WithdrawManager: `0x...` (To be deployed)
- Guardian: `0x...` (To be deployed)

### Security Considerations

#### Signature Verification

The system uses EIP-712 structured data signing for secure meta-transaction verification:

```javascript
const domain = {
    name: 'MinimalForwarder',
    version: '0.0.1',
    chainId: chainId,
    verifyingContract: forwarderAddress
};

const types = {
    ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'data', type: 'bytes' }
    ]
};
```

#### Access Control

All contracts implement proper access control mechanisms:

- **Role-based access control** for administrative functions
- **Relayer authorization** for transaction execution
- **Guardian controls** for emergency situations
- **Time-locked operations** for critical parameter changes

#### Audit Recommendations

Before mainnet deployment, ensure:

1. **Professional security audit** by reputable auditing firms
2. **Formal verification** of critical contract functions
3. **Extensive testing** on testnets with real-world scenarios
4. **Bug bounty program** for community security review
5. **Gradual rollout** with initial limits and monitoring

### Gas Optimization

The contracts are optimized for gas efficiency:

- **Minimal storage operations** to reduce gas costs
- **Batch operations** for multiple transactions
- **Efficient signature verification** using precompiled contracts
- **Storage packing** for related variables
- **Assembly optimizations** where appropriate

Typical gas costs:
- Meta-transaction execution: ~50,000 gas
- ERC-20 transfer via relayer: ~65,000 gas
- NFT transfer via relayer: ~80,000 gas
- Batch operations: ~30,000 gas per additional transaction


## Monitoring

The system includes comprehensive monitoring and observability features built on industry-standard tools.

### Prometheus Metrics

The relayer backend exposes detailed metrics for monitoring and alerting:

#### Transaction Metrics

- `relayer_transactions_total`: Total number of transactions processed
- `relayer_transactions_successful`: Number of successful transactions
- `relayer_transactions_failed`: Number of failed transactions
- `relayer_transaction_duration_seconds`: Transaction processing duration
- `relayer_gas_used_total`: Total gas consumed
- `relayer_gas_price_gwei`: Current gas price by network

#### System Metrics

- `relayer_uptime_seconds`: System uptime
- `relayer_memory_usage_bytes`: Memory usage
- `relayer_cpu_usage_percent`: CPU utilization
- `relayer_database_connections`: Active database connections
- `relayer_redis_connections`: Active Redis connections

#### Policy Metrics

- `relayer_policy_violations_total`: Number of policy violations
- `relayer_rate_limit_hits_total`: Rate limiting events
- `relayer_allowlist_checks_total`: Allowlist validation checks

#### Network Metrics

- `relayer_network_latency_seconds`: Network RPC latency
- `relayer_block_number`: Current block number by network
- `relayer_nonce_gaps_total`: Nonce gap occurrences

### Grafana Dashboards

Pre-configured dashboards provide visual insights into system performance:

#### System Overview Dashboard

- Transaction volume and success rates
- Gas consumption trends
- System resource utilization
- Network health status
- Error rate monitoring

#### Transaction Analysis Dashboard

- Transaction flow analysis
- Gas price trends
- Network distribution
- User activity patterns
- Policy violation tracking

#### Operational Dashboard

- Real-time transaction monitoring
- Alert status and history
- System capacity metrics
- Performance benchmarks
- SLA compliance tracking

### Alerting Rules

Prometheus alerting rules for proactive monitoring:

```yaml
groups:
  - name: relayer.rules
    rules:
      - alert: HighTransactionFailureRate
        expr: rate(relayer_transactions_failed[5m]) / rate(relayer_transactions_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High transaction failure rate detected"
          description: "Transaction failure rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      - alert: DatabaseConnectionsHigh
        expr: relayer_database_connections > 15
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High database connection count"
          description: "Database connections: {{ $value }}"

      - alert: SystemMemoryHigh
        expr: relayer_memory_usage_bytes / (1024*1024*1024) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage: {{ $value | humanize }}GB"

      - alert: NetworkLatencyHigh
        expr: relayer_network_latency_seconds > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High network latency"
          description: "Network latency: {{ $value }}s for {{ $labels.network }}"
```

### Log Management

Structured logging with multiple output formats and levels:

#### Log Levels

- **ERROR**: System errors and failures
- **WARN**: Warning conditions and policy violations
- **INFO**: General operational information
- **DEBUG**: Detailed debugging information

#### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "relayer-backend",
  "message": "Transaction relayed successfully",
  "data": {
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "network": "ethereum",
    "gasUsed": 21000,
    "gasPrice": "25000000000"
  },
  "requestId": "req-123456",
  "userId": "user-789"
}
```

#### Log Aggregation

Integration with popular log aggregation systems:

- **ELK Stack**: Elasticsearch, Logstash, and Kibana
- **Fluentd**: Log collection and forwarding
- **Grafana Loki**: Log aggregation and querying
- **Splunk**: Enterprise log management

### Health Checks

Multiple health check endpoints for different monitoring needs:

#### Basic Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

#### Detailed Health Check

```bash
curl http://localhost:3000/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 5,
      "connections": 8
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2,
      "memory": "150MB"
    },
    "networks": {
      "ethereum": {
        "status": "healthy",
        "blockNumber": 18500000,
        "latency": 150
      },
      "bsc": {
        "status": "healthy",
        "blockNumber": 34000000,
        "latency": 200
      }
    }
  }
}
```

#### Readiness Check

```bash
curl http://localhost:3000/ready
```

Used by Kubernetes and other orchestration systems to determine if the service is ready to receive traffic.

### Performance Monitoring

#### Application Performance Monitoring (APM)

Integration with APM tools for detailed performance insights:

- **New Relic**: Application performance monitoring
- **Datadog**: Infrastructure and application monitoring
- **Dynatrace**: Full-stack monitoring solution
- **Elastic APM**: Open-source APM solution

#### Custom Metrics

Application-specific metrics for business intelligence:

```javascript
// Custom metric examples
metrics.increment('business.user_onboarded');
metrics.histogram('business.transaction_value', transactionValue);
metrics.gauge('business.active_users', activeUserCount);
```

## Security

Security is paramount in a system handling financial transactions and private keys.

### Threat Model

#### Identified Threats

1. **Private Key Compromise**: Unauthorized access to relayer private keys
2. **Signature Replay**: Reuse of valid signatures for unauthorized transactions
3. **Policy Bypass**: Circumvention of rate limiting and allowlist controls
4. **DoS Attacks**: Service disruption through resource exhaustion
5. **Smart Contract Vulnerabilities**: Bugs in contract code leading to fund loss

#### Mitigation Strategies

**Private Key Security:**
- Hardware Security Module (HSM) integration
- AWS KMS for key management
- Key rotation procedures
- Multi-signature schemes for critical operations

**Signature Security:**
- EIP-712 structured data signing
- Nonce-based replay protection
- Signature expiration timestamps
- Domain separation for different networks

**Access Control:**
- Role-based access control (RBAC)
- API key authentication
- IP allowlisting for administrative functions
- Multi-factor authentication (MFA)

### Security Best Practices

#### Operational Security

**Key Management:**
```bash
# Use environment variables for sensitive data
export RELAYER_PRIVATE_KEY="0x..."
export AWS_KMS_KEY_ID="arn:aws:kms:..."

# Never commit keys to version control
echo "*.key" >> .gitignore
echo ".env" >> .gitignore

# Use secure key generation
openssl rand -hex 32
```

**Network Security:**
- TLS 1.3 for all communications
- Certificate pinning for critical connections
- VPN access for administrative functions
- Network segmentation and firewalls

**Infrastructure Security:**
- Regular security updates
- Vulnerability scanning
- Intrusion detection systems
- Security incident response procedures

#### Application Security

**Input Validation:**
```javascript
// Validate all inputs
const validateAddress = (address) => {
  if (!ethers.utils.isAddress(address)) {
    throw new Error('Invalid address format');
  }
};

const validateSignature = (signature) => {
  if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
    throw new Error('Invalid signature format');
  }
};
```

**Rate Limiting:**
```javascript
// Implement multiple layers of rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Per-address rate limiting
const addressLimiter = new Map();
```

**Error Handling:**
```javascript
// Never expose sensitive information in errors
try {
  await processTransaction(tx);
} catch (error) {
  logger.error('Transaction processing failed', { error, txId });
  res.status(500).json({ 
    success: false, 
    error: 'Transaction processing failed',
    code: 'PROCESSING_ERROR'
  });
}
```

### Audit and Compliance

#### Security Audits

**Smart Contract Audits:**
- Professional security audit by reputable firms
- Formal verification of critical functions
- Bug bounty programs
- Continuous security monitoring

**Infrastructure Audits:**
- Penetration testing
- Vulnerability assessments
- Configuration reviews
- Access control audits

#### Compliance Requirements

**Data Protection:**
- GDPR compliance for EU users
- Data encryption at rest and in transit
- Data retention policies
- User consent management

**Financial Regulations:**
- AML/KYC compliance where required
- Transaction monitoring and reporting
- Sanctions screening
- Regulatory reporting

### Incident Response

#### Response Procedures

**Security Incident Response:**
1. **Detection**: Automated alerting and monitoring
2. **Assessment**: Severity evaluation and impact analysis
3. **Containment**: Immediate threat mitigation
4. **Eradication**: Root cause elimination
5. **Recovery**: Service restoration
6. **Lessons Learned**: Post-incident review

**Emergency Procedures:**
```bash
# Emergency pause all operations
relayer-cli emergency pause

# Revoke compromised keys
relayer-cli security revoke-key --key-id compromised-key

# Enable maintenance mode
relayer-cli maintenance enable

# Drain transaction queue
relayer-cli queue drain --safe-mode
```

#### Communication Plan

**Internal Communication:**
- Incident commander designation
- Stakeholder notification procedures
- Status update protocols
- Escalation procedures

**External Communication:**
- User notification templates
- Public status page updates
- Regulatory reporting requirements
- Media response procedures

## Troubleshooting

Common issues and their solutions.

### Common Issues

#### Transaction Failures

**Issue**: Transactions failing with "insufficient gas" error

**Symptoms:**
- High transaction failure rate
- "out of gas" errors in logs
- Transactions reverting on-chain

**Solutions:**
```bash
# Check current gas price settings
relayer-cli config get gas.maxGasPrice

# Update gas price limits
relayer-cli config set gas.maxGasPrice 150000000000  # 150 gwei

# Check gas estimation accuracy
relayer-cli debug gas-estimation --tx-hash 0x...

# Monitor gas price trends
relayer-cli watch gas-prices --network ethereum
```

**Issue**: Nonce management errors

**Symptoms:**
- "nonce too low" errors
- "nonce too high" errors
- Transaction queue backups

**Solutions:**
```bash
# Check current nonce status
relayer-cli status nonce --address 0x...

# Reset nonce tracking
relayer-cli nonce reset --address 0x... --network ethereum

# Clear stuck transactions
relayer-cli queue clear --status stuck

# Enable nonce gap detection
relayer-cli config set nonce.gapDetection true
```

#### Database Issues

**Issue**: Database connection errors

**Symptoms:**
- "connection refused" errors
- High connection count
- Slow query performance

**Solutions:**
```bash
# Check database status
relayer-cli status database

# Monitor connection pool
relayer-cli debug database connections

# Optimize database configuration
relayer-cli config set database.maxConnections 20
relayer-cli config set database.connectionTimeout 30000

# Run database maintenance
relayer-cli database vacuum
relayer-cli database reindex
```

**Issue**: Redis connectivity problems

**Symptoms:**
- Cache misses
- Session data loss
- Nonce synchronization issues

**Solutions:**
```bash
# Check Redis status
relayer-cli status redis

# Clear Redis cache
relayer-cli cache clear --pattern "relayer:*"

# Monitor Redis memory usage
relayer-cli debug redis memory

# Configure Redis persistence
relayer-cli config set redis.persistence true
```

#### Network Issues

**Issue**: RPC endpoint failures

**Symptoms:**
- Network timeout errors
- "method not supported" errors
- Inconsistent block numbers

**Solutions:**
```bash
# Check network status
relayer-cli status network --network ethereum

# Test RPC endpoints
relayer-cli debug rpc-test --network ethereum

# Switch to backup RPC
relayer-cli config set networks.ethereum.rpcUrl https://backup-rpc.com

# Monitor network latency
relayer-cli watch network-latency --network ethereum
```

### Debugging Tools

#### Log Analysis

**View recent logs:**
```bash
# View last 100 log entries
relayer-cli logs tail --lines 100

# Filter by log level
relayer-cli logs tail --level ERROR

# Filter by service
relayer-cli logs tail --service relayer-backend

# Search logs
relayer-cli logs search --query "transaction failed"
```

**Log analysis commands:**
```bash
# Analyze error patterns
relayer-cli logs analyze --pattern "error" --time-range "1h"

# Generate log report
relayer-cli logs report --output report.json

# Export logs for external analysis
relayer-cli logs export --format json --output logs.json
```

#### Performance Debugging

**Transaction tracing:**
```bash
# Trace specific transaction
relayer-cli debug trace-transaction --tx-hash 0x...

# Profile transaction processing
relayer-cli debug profile --duration 60s

# Memory usage analysis
relayer-cli debug memory --heap-dump
```

**Database query analysis:**
```bash
# Show slow queries
relayer-cli debug slow-queries --threshold 1000ms

# Analyze query performance
relayer-cli debug query-stats

# Database index analysis
relayer-cli debug index-usage
```

#### Network Debugging

**RPC debugging:**
```bash
# Test RPC endpoints
relayer-cli debug rpc-test --network ethereum --method eth_blockNumber

# Measure RPC latency
relayer-cli debug rpc-latency --network ethereum --samples 10

# Compare RPC providers
relayer-cli debug rpc-compare --network ethereum --providers provider1,provider2
```

### Recovery Procedures

#### Service Recovery

**Restart services:**
```bash
# Restart specific service
docker-compose restart relayer-backend

# Restart all services
docker-compose restart

# Rolling restart with zero downtime
relayer-cli maintenance rolling-restart
```

**Database recovery:**
```bash
# Restore from backup
relayer-cli database restore --backup-file backup.sql

# Repair corrupted tables
relayer-cli database repair --table transactions

# Rebuild indexes
relayer-cli database reindex --all
```

#### Data Recovery

**Transaction recovery:**
```bash
# Recover failed transactions
relayer-cli recovery transactions --status failed --retry

# Rebuild transaction cache
relayer-cli cache rebuild --type transactions

# Sync transaction status from blockchain
relayer-cli sync transaction-status --network ethereum
```

**Configuration recovery:**
```bash
# Restore configuration from backup
relayer-cli config restore --backup-file config-backup.json

# Reset to default configuration
relayer-cli config reset --confirm

# Validate configuration integrity
relayer-cli config validate --fix
```

### Performance Optimization

#### Database Optimization

**Query optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_network_status ON transactions(network, status);

-- Partition large tables
CREATE TABLE transactions_2024_01 PARTITION OF transactions
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**Connection pooling:**
```javascript
// Optimize connection pool settings
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Application Optimization

**Memory optimization:**
```javascript
// Implement object pooling
const objectPool = new ObjectPool(() => new TransactionProcessor());

// Use streaming for large datasets
const stream = database.stream('SELECT * FROM large_table');

// Implement caching strategies
const cache = new LRUCache({ max: 1000, maxAge: 1000 * 60 * 5 });
```

**CPU optimization:**
```javascript
// Use worker threads for CPU-intensive tasks
const worker = new Worker('./signature-worker.js');

// Implement batching for database operations
const batch = new BatchProcessor({ batchSize: 100, flushInterval: 1000 });
```

### Monitoring and Alerting

#### Custom Alerts

**Create custom alert rules:**
```yaml
# High memory usage alert
- alert: HighMemoryUsage
  expr: process_resident_memory_bytes / (1024*1024*1024) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage detected"

# Transaction queue backup alert
- alert: TransactionQueueBackup
  expr: relayer_queue_size > 1000
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Transaction queue backup detected"
```

**Alert notification channels:**
```yaml
# Slack notifications
- name: 'slack-alerts'
  slack_configs:
    - api_url: 'YOUR_SLACK_WEBHOOK_URL'
      channel: '#alerts'
      title: 'Relayer Alert'

# Email notifications
- name: 'email-alerts'
  email_configs:
    - to: 'ops@company.com'
      subject: 'Relayer System Alert'
```

This comprehensive documentation provides everything needed to deploy, operate, and maintain the Gas-Fee Sponsor Relayer Bot system. For additional support or questions, please refer to the project repository or contact the development team.


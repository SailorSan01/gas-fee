# API Documentation

## Overview

The Gas-Fee Sponsor Relayer Bot provides a comprehensive REST API for submitting meta-transactions, monitoring system status, and managing policies. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
Production: https://api.relayer.example.com
Development: http://localhost:3000
```

## Authentication

Most endpoints require API key authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" https://api.relayer.example.com/api/v1/relay
```

## Rate Limiting

API requests are rate-limited per API key:
- **Standard**: 1000 requests per hour
- **Premium**: 10000 requests per hour
- **Enterprise**: Unlimited

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

## Endpoints

### Transaction Management

#### Submit Meta-Transaction

Submit a meta-transaction for relaying to the blockchain.

**Endpoint:** `POST /api/v1/relay`

**Request Body:**
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

**Response:**
```json
{
  "success": true,
  "data": {
    "txHash": "0x1234567890abcdef...",
    "gasUsed": "21000",
    "gasPrice": "25000000000",
    "status": "pending"
  },
  "message": "Transaction relayed successfully"
}
```

#### Get Transaction Status

Retrieve the status and details of a specific transaction.

**Endpoint:** `GET /api/v1/transaction/{txHash}`

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_hash": "0x1234567890abcdef...",
    "status": "confirmed",
    "from_address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
    "to_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "network": "ethereum",
    "gas_used": "21000",
    "gas_price": "25000000000",
    "block_number": 18500000,
    "confirmations": 12,
    "created_at": "2024-01-15T10:30:00Z",
    "confirmed_at": "2024-01-15T10:31:00Z"
  }
}
```

#### Get User Transactions

Retrieve transactions for a specific address.

**Endpoint:** `GET /api/v1/transactions/{address}`

**Query Parameters:**
- `limit` (optional): Maximum number of transactions (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (pending, confirmed, failed)
- `network` (optional): Filter by network

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
    "transactions": [
      {
        "tx_hash": "0x...",
        "status": "confirmed",
        "network": "ethereum",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

### Network Information

#### Get Supported Networks

Retrieve list of supported networks and their configuration.

**Endpoint:** `GET /api/v1/networks`

**Response:**
```json
{
  "success": true,
  "data": {
    "ethereum": {
      "name": "Ethereum",
      "chainId": 1,
      "supported": true,
      "contracts": {
        "forwarder": "0x...",
        "withdrawManager": "0x..."
      }
    },
    "bsc": {
      "name": "Binance Smart Chain",
      "chainId": 56,
      "supported": true,
      "contracts": {
        "forwarder": "0x...",
        "withdrawManager": "0x..."
      }
    }
  }
}
```

#### Get Gas Price

Get current gas price estimates for a specific network.

**Endpoint:** `GET /api/v1/gas-price/{network}`

**Response:**
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
    },
    "blockNumber": 18500000
  }
}
```

### Policy Management

#### Get Policy Rules

Retrieve current policy rules.

**Endpoint:** `GET /api/v1/policy/rules`

**Query Parameters:**
- `type` (optional): Filter by rule type (allowlist, quota, gas_limit, token_limit)
- `target` (optional): Filter by target address or network

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "rule_type": "allowlist",
      "target": "*",
      "value": "{\"addresses\": [\"0x...\", \"0x...\"]}",
      "enabled": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Create Policy Rule

Create a new policy rule.

**Endpoint:** `POST /api/v1/policy/rules`

**Request Body:**
```json
{
  "rule_type": "quota",
  "target": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
  "value": "{\"maxTransactionsPerHour\": 50}",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "rule_type": "quota",
    "target": "0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1",
    "value": "{\"maxTransactionsPerHour\": 50}",
    "enabled": true,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### System Monitoring

#### Health Check

Basic health check endpoint.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

#### Detailed Health Check

Comprehensive system health information.

**Endpoint:** `GET /health/detailed`

**Response:**
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
      }
    }
  }
}
```

#### System Metrics

Get system performance metrics.

**Endpoint:** `GET /api/v1/metrics`

**Response:**
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
      "memory": {
        "used": "512MB",
        "total": "2GB"
      },
      "cpu": {
        "usage": "25%"
      }
    },
    "networks": {
      "ethereum": {
        "transactions": 800,
        "avgGasPrice": "25000000000"
      }
    }
  }
}
```

## WebSocket API

Real-time updates via WebSocket connection.

### Connection

```javascript
const ws = new WebSocket('wss://api.relayer.example.com/ws');
```

### Authentication

Send API key after connection:

```javascript
ws.send(JSON.stringify({
  type: 'auth',
  apiKey: 'your-api-key'
}));
```

### Subscribe to Events

```javascript
// Subscribe to transaction updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'transactions',
  address: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b1'
}));

// Subscribe to system events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'system'
}));
```

### Event Types

#### Transaction Update

```json
{
  "type": "transaction_update",
  "data": {
    "txHash": "0x...",
    "status": "confirmed",
    "blockNumber": 18500000
  }
}
```

#### System Alert

```json
{
  "type": "system_alert",
  "data": {
    "level": "warning",
    "message": "High gas prices detected",
    "network": "ethereum"
  }
}
```

## SDK Usage

### JavaScript/TypeScript SDK

```bash
npm install @gas-sponsor/sdk
```

```javascript
import { RelayerClient } from '@gas-sponsor/sdk';

const client = new RelayerClient({
  apiUrl: 'https://api.relayer.example.com',
  apiKey: 'your-api-key'
});

// Submit transaction
const result = await client.relayTransaction({
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  signature: '0x...',
  network: 'ethereum'
});

// Get transaction status
const status = await client.getTransactionStatus(result.txHash);

// Subscribe to events
client.on('transaction_update', (data) => {
  console.log('Transaction updated:', data);
});
```

### Python SDK

```bash
pip install gas-sponsor-sdk
```

```python
from gas_sponsor import RelayerClient

client = RelayerClient(
    api_url='https://api.relayer.example.com',
    api_key='your-api-key'
)

# Submit transaction
result = client.relay_transaction({
    'from': '0x...',
    'to': '0x...',
    'value': '1000000000000000000',
    'signature': '0x...',
    'network': 'ethereum'
})

# Get transaction status
status = client.get_transaction_status(result['txHash'])
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `SIGNATURE_INVALID` | Invalid transaction signature |
| `NONCE_INVALID` | Invalid or used nonce |
| `INSUFFICIENT_BALANCE` | Insufficient balance for transaction |
| `GAS_LIMIT_EXCEEDED` | Gas limit too high |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `NETWORK_UNSUPPORTED` | Network not supported |
| `POLICY_VIOLATION` | Transaction violates policy |
| `UNAUTHORIZED` | Invalid or missing API key |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/v1/relay` | 100 | 1 hour |
| `/api/v1/transaction/*` | 1000 | 1 hour |
| `/api/v1/transactions/*` | 500 | 1 hour |
| `/api/v1/networks` | 100 | 1 hour |
| `/health` | No limit | - |

## Examples

### Complete Transaction Flow

```javascript
// 1. Get user's nonce
const nonce = await client.getNonce(userAddress);

// 2. Create meta-transaction
const metaTx = {
  from: userAddress,
  to: contractAddress,
  value: '0',
  gas: '100000',
  nonce: nonce,
  data: contractCallData
};

// 3. Sign meta-transaction
const signature = await signer.signTypedData(domain, types, metaTx);

// 4. Submit to relayer
const result = await client.relayTransaction({
  ...metaTx,
  signature,
  network: 'ethereum'
});

// 5. Monitor transaction
const checkStatus = async () => {
  const status = await client.getTransactionStatus(result.txHash);
  if (status.status === 'pending') {
    setTimeout(checkStatus, 5000);
  } else {
    console.log('Transaction completed:', status);
  }
};
checkStatus();
```

### Batch Operations

```javascript
// Submit multiple transactions
const transactions = [
  { from: '0x...', to: '0x...', value: '1000000000000000000' },
  { from: '0x...', to: '0x...', value: '2000000000000000000' }
];

const results = await Promise.all(
  transactions.map(tx => client.relayTransaction(tx))
);

console.log('Batch submitted:', results.map(r => r.txHash));
```

This API documentation provides comprehensive information for integrating with the Gas-Fee Sponsor Relayer Bot system.


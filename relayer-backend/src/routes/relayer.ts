import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { RelayerService, MetaTransactionRequest } from '../services/relayer';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Validation schemas
const metaTransactionSchema = Joi.object({
  from: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  value: Joi.string().pattern(/^\d+$/).required(),
  gas: Joi.string().pattern(/^\d+$/).required(),
  nonce: Joi.string().pattern(/^\d+$/).required(),
  data: Joi.string().pattern(/^0x[a-fA-F0-9]*$/).required(),
  signature: Joi.string().pattern(/^0x[a-fA-F0-9]{130}$/).required(),
  network: Joi.string().valid('ethereum', 'bsc', 'polygon', 'localhost').required(),
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  tokenType: Joi.string().valid('ERC20', 'ERC721', 'ERC1155').optional(),
  amount: Joi.string().pattern(/^\d+$/).optional(),
  tokenId: Joi.string().pattern(/^\d+$/).optional()
});

const addressSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required();
const txHashSchema = Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required();

export function relayerRoutes(relayerService: RelayerService): Router {
  const router = Router();

  // Submit meta-transaction for relaying
  router.post('/relay', asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const { error, value } = metaTransactionSchema.validate(req.body);
    if (error) {
      throw new ValidationError(`Validation error: ${error.details[0].message}`);
    }

    const metaTxRequest: MetaTransactionRequest = value;

    logger.info('Received meta-transaction relay request', {
      from: metaTxRequest.from,
      to: metaTxRequest.to,
      network: metaTxRequest.network,
      tokenType: metaTxRequest.tokenType
    });

    // Relay the transaction
    const result = await relayerService.relayTransaction(metaTxRequest);

    if (result.success) {
      res.json({
        success: true,
        data: {
          txHash: result.txHash,
          gasUsed: result.gasUsed,
          gasPrice: result.gasPrice
        },
        message: 'Transaction relayed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to relay transaction'
      });
    }
  }));

  // Get transaction status
  router.get('/transaction/:txHash', asyncHandler(async (req: Request, res: Response) => {
    // Validate transaction hash
    const { error, value } = txHashSchema.validate(req.params.txHash);
    if (error) {
      throw new ValidationError('Invalid transaction hash format');
    }

    const txHash = value;
    const transaction = await relayerService.getTransactionStatus(txHash);

    if (transaction) {
      res.json({
        success: true,
        data: transaction
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
  }));

  // Get transactions by address
  router.get('/transactions/:address', asyncHandler(async (req: Request, res: Response) => {
    // Validate address
    const { error, value } = addressSchema.validate(req.params.address);
    if (error) {
      throw new ValidationError('Invalid address format');
    }

    const address = value;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (limit > 1000) {
      throw new ValidationError('Limit cannot exceed 1000');
    }

    const transactions = await relayerService.getTransactionsByAddress(address);

    res.json({
      success: true,
      data: {
        address,
        transactions: transactions.slice(0, limit),
        total: transactions.length
      }
    });
  }));

  // Get relayer metrics
  router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
    const metrics = await relayerService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });
  }));

  // Get supported networks
  router.get('/networks', asyncHandler(async (req: Request, res: Response) => {
    const networks = {
      ethereum: {
        name: 'Ethereum',
        chainId: 1,
        supported: true
      },
      bsc: {
        name: 'Binance Smart Chain',
        chainId: 56,
        supported: true
      },
      polygon: {
        name: 'Polygon',
        chainId: 137,
        supported: true
      },
      localhost: {
        name: 'Localhost',
        chainId: 31337,
        supported: true
      }
    };

    res.json({
      success: true,
      data: networks
    });
  }));

  // Get gas price estimates
  router.get('/gas-price/:network', asyncHandler(async (req: Request, res: Response) => {
    const network = req.params.network;
    
    if (!['ethereum', 'bsc', 'polygon', 'localhost'].includes(network)) {
      throw new ValidationError('Unsupported network');
    }

    // TODO: Implement actual gas price fetching
    // This would require access to the providers in RelayerService
    const gasPrices = {
      network,
      timestamp: new Date().toISOString(),
      prices: {
        slow: '20000000000',    // 20 gwei
        standard: '25000000000', // 25 gwei
        fast: '30000000000'     // 30 gwei
      }
    };

    res.json({
      success: true,
      data: gasPrices
    });
  }));

  // Estimate gas for a transaction
  router.post('/estimate-gas', asyncHandler(async (req: Request, res: Response) => {
    const estimateSchema = Joi.object({
      from: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
      value: Joi.string().pattern(/^\d+$/).optional().default('0'),
      data: Joi.string().pattern(/^0x[a-fA-F0-9]*$/).optional().default('0x'),
      network: Joi.string().valid('ethereum', 'bsc', 'polygon', 'localhost').required()
    });

    const { error, value } = estimateSchema.validate(req.body);
    if (error) {
      throw new ValidationError(`Validation error: ${error.details[0].message}`);
    }

    // TODO: Implement actual gas estimation
    // This would require access to the providers in RelayerService
    const gasEstimate = {
      network: value.network,
      gasLimit: '21000',
      gasPrice: '25000000000',
      estimatedCost: '525000000000000', // gasLimit * gasPrice
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: gasEstimate
    });
  }));

  // Health check for relayer service
  router.get('/health', asyncHandler(async (req: Request, res: Response) => {
    const isHealthy = relayerService.isHealthy();

    if (isHealthy) {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Relayer service is unhealthy'
      });
    }
  }));

  return router;
}


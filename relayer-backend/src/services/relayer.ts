import { ethers } from 'ethers';
import { config } from '../config/config';
import { logger, logTransaction, logError } from '../utils/logger';
import { DatabaseService, TransactionRecord } from './database';
import { RedisService } from './redis';
import { SignerFactory, SignerInterface } from './signer';
import { PolicyEngine } from './policy';
import { FlashbotsService } from './flashbots';
import { MetricsService } from './metrics';

export interface MetaTransactionRequest {
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

export interface RelayResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  gasPrice?: string;
}

export class RelayerService {
  private providers: Map<string, ethers.Provider> = new Map();
  private signers: Map<string, SignerInterface> = new Map();
  private policyEngine: PolicyEngine;
  private flashbotsService: FlashbotsService;
  private metricsService: MetricsService;
  private isInitialized = false;

  constructor(
    private databaseService: DatabaseService,
    private redisService: RedisService
  ) {
    this.policyEngine = new PolicyEngine(databaseService, redisService);
    this.flashbotsService = new FlashbotsService();
    this.metricsService = new MetricsService();
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize providers for each network
      for (const [networkName, networkConfig] of Object.entries(config.blockchain.networks)) {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
        this.providers.set(networkName, provider);

        // Create signer for each network
        const signer = SignerFactory.createSigner(provider);
        this.signers.set(networkName, signer);

        logger.info(`✅ Initialized provider and signer for ${networkName}`);
      }

      // Initialize policy engine
      await this.policyEngine.initialize();

      // Initialize Flashbots service
      if (config.relayer.flashbots.enabled) {
        await this.flashbotsService.initialize();
      }

      this.isInitialized = true;
      logger.info('✅ RelayerService initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize RelayerService:', error);
      throw error;
    }
  }

  public async relayTransaction(request: MetaTransactionRequest): Promise<RelayResult> {
    if (!this.isInitialized) {
      throw new Error('RelayerService not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Validate the request
      await this.validateRequest(request);

      // Check policies
      const policyResult = await this.policyEngine.checkPolicies(request);
      if (!policyResult.allowed) {
        throw new Error(`Policy violation: ${policyResult.reason}`);
      }

      // Get provider and signer for the network
      const provider = this.providers.get(request.network);
      const signer = this.signers.get(request.network);
      
      if (!provider || !signer) {
        throw new Error(`Unsupported network: ${request.network}`);
      }

      // Verify the meta-transaction signature
      await this.verifyMetaTransactionSignature(request);

      // Simulate the transaction
      await this.simulateTransaction(request, provider);

      // Get gas price and estimate gas
      const gasPrice = await this.getOptimalGasPrice(provider, request.network);
      const gasLimit = await this.estimateGas(request, provider);

      // Create the transaction
      const transaction: ethers.TransactionRequest = {
        to: request.to,
        value: request.value,
        data: request.data,
        gasLimit: gasLimit,
        gasPrice: gasPrice,
        nonce: await this.getNextNonce(signer, provider, request.network)
      };

      // Sign and send the transaction
      let txHash: string;
      let gasUsed: string | undefined;

      if (config.relayer.flashbots.enabled && request.network === 'ethereum') {
        // Use Flashbots for Ethereum mainnet
        const result = await this.flashbotsService.sendBundle([transaction], signer);
        txHash = result.txHash;
      } else {
        // Use regular transaction submission
        const signedTx = await signer.signTransaction(transaction);
        const tx = await provider.broadcastTransaction(signedTx);
        txHash = tx.hash;

        // Wait for confirmation
        const receipt = await tx.wait();
        gasUsed = receipt?.gasUsed.toString();
      }

      // Save transaction to database
      const transactionRecord: TransactionRecord = {
        tx_hash: txHash,
        from_address: request.from,
        to_address: request.to,
        network: request.network,
        status: 'pending',
        gas_price: gasPrice.toString(),
        relayer_address: await signer.getAddress(),
        token_address: request.tokenAddress,
        token_type: request.tokenType,
        amount: request.amount,
        token_id: request.tokenId
      };

      await this.databaseService.saveTransaction(transactionRecord);

      // Track pending transaction in Redis
      await this.redisService.trackPendingTransaction(txHash, {
        request,
        timestamp: Date.now()
      });

      // Update metrics
      this.metricsService.recordTransaction(request.network, 'success');
      this.metricsService.recordGasUsed(request.network, gasUsed || '0');
      this.metricsService.recordLatency(Date.now() - startTime);

      logTransaction(txHash, 'relayed', {
        network: request.network,
        from: request.from,
        to: request.to,
        gasPrice: gasPrice.toString(),
        gasUsed
      });

      return {
        success: true,
        txHash,
        gasUsed,
        gasPrice: gasPrice.toString()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logError(error as Error, {
        request,
        network: request.network
      });

      this.metricsService.recordTransaction(request.network, 'failed');
      this.metricsService.recordLatency(Date.now() - startTime);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async validateRequest(request: MetaTransactionRequest): Promise<void> {
    // Basic validation
    if (!ethers.isAddress(request.from)) {
      throw new Error('Invalid from address');
    }

    if (!ethers.isAddress(request.to)) {
      throw new Error('Invalid to address');
    }

    if (!request.signature) {
      throw new Error('Signature is required');
    }

    if (!this.providers.has(request.network)) {
      throw new Error(`Unsupported network: ${request.network}`);
    }

    // Validate gas limit
    const gasLimit = BigInt(request.gas);
    const maxGasLimit = BigInt(config.relayer.maxGasLimit);
    
    if (gasLimit > maxGasLimit) {
      throw new Error(`Gas limit too high: ${gasLimit} > ${maxGasLimit}`);
    }

    // Validate value
    const value = BigInt(request.value);
    const maxValue = BigInt(config.relayer.maxValuePerTransaction);
    
    if (value > maxValue) {
      throw new Error(`Transaction value too high: ${value} > ${maxValue}`);
    }
  }

  private async verifyMetaTransactionSignature(request: MetaTransactionRequest): Promise<void> {
    try {
      // Get the network configuration
      const networkConfig = config.blockchain.networks[request.network];
      if (!networkConfig) {
        throw new Error(`Network configuration not found: ${request.network}`);
      }

      // Create the EIP-712 domain
      const domain = {
        name: 'MinimalForwarder',
        version: '0.0.1',
        chainId: networkConfig.chainId,
        verifyingContract: networkConfig.contracts.forwarder
      };

      // Create the types
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

      // Create the value object
      const value = {
        from: request.from,
        to: request.to,
        value: request.value,
        gas: request.gas,
        nonce: request.nonce,
        data: request.data
      };

      // Verify the signature
      const recoveredAddress = ethers.verifyTypedData(domain, types, value, request.signature);
      
      if (recoveredAddress.toLowerCase() !== request.from.toLowerCase()) {
        throw new Error('Invalid signature');
      }

    } catch (error) {
      logger.error('Signature verification failed:', error);
      throw new Error('Invalid meta-transaction signature');
    }
  }

  private async simulateTransaction(request: MetaTransactionRequest, provider: ethers.Provider): Promise<void> {
    try {
      // Use callStatic to simulate the transaction
      const result = await provider.call({
        to: request.to,
        from: request.from,
        value: request.value,
        data: request.data
      });

      logger.debug('Transaction simulation successful', { result });
    } catch (error) {
      logger.error('Transaction simulation failed:', error);
      throw new Error('Transaction simulation failed - transaction would revert');
    }
  }

  private async getOptimalGasPrice(provider: ethers.Provider, network: string): Promise<bigint> {
    try {
      const feeData = await provider.getFeeData();
      let gasPrice = feeData.gasPrice || BigInt(0);

      // Apply gas multiplier
      gasPrice = gasPrice * BigInt(Math.floor(config.relayer.gasMultiplier * 100)) / BigInt(100);

      // Check against maximum gas price
      const maxGasPrice = BigInt(config.relayer.maxGasPrice);
      if (gasPrice > maxGasPrice) {
        gasPrice = maxGasPrice;
      }

      return gasPrice;
    } catch (error) {
      logger.error('Error getting gas price:', error);
      // Fallback to a reasonable default
      return BigInt('20000000000'); // 20 gwei
    }
  }

  private async estimateGas(request: MetaTransactionRequest, provider: ethers.Provider): Promise<bigint> {
    try {
      const gasEstimate = await provider.estimateGas({
        to: request.to,
        from: request.from,
        value: request.value,
        data: request.data
      });

      // Add 20% buffer
      return gasEstimate * BigInt(120) / BigInt(100);
    } catch (error) {
      logger.error('Error estimating gas:', error);
      // Fallback to the requested gas limit
      return BigInt(request.gas);
    }
  }

  private async getNextNonce(signer: SignerInterface, provider: ethers.Provider, network: string): Promise<number> {
    try {
      const address = await signer.getAddress();
      
      // Try to get nonce from Redis first
      const cachedNonce = await this.redisService.getCurrentNonce(address, network);
      
      if (cachedNonce !== null) {
        const nextNonce = await this.redisService.getNextNonce(address, network);
        return nextNonce;
      }

      // Get nonce from blockchain
      const onChainNonce = await provider.getTransactionCount(address, 'pending');
      
      // Set in Redis
      await this.redisService.setNonce(address, network, onChainNonce);
      
      return onChainNonce;
    } catch (error) {
      logger.error('Error getting next nonce:', error);
      throw error;
    }
  }

  public async getTransactionStatus(txHash: string): Promise<TransactionRecord | null> {
    try {
      return await this.databaseService.getTransaction(txHash);
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      return null;
    }
  }

  public async getTransactionsByAddress(address: string): Promise<TransactionRecord[]> {
    try {
      return await this.databaseService.getTransactionsByAddress(address);
    } catch (error) {
      logger.error('Error getting transactions by address:', error);
      return [];
    }
  }

  public async getMetrics(): Promise<any> {
    try {
      return this.metricsService.getMetrics();
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return {};
    }
  }

  public async shutdown(): Promise<void> {
    try {
      // Stop any background processes
      logger.info('🛑 Shutting down RelayerService...');
      
      // Close provider connections if needed
      // (ethers providers don't have explicit close methods)
      
      this.isInitialized = false;
      logger.info('✅ RelayerService shut down successfully');
    } catch (error) {
      logger.error('❌ Error shutting down RelayerService:', error);
      throw error;
    }
  }

  public isHealthy(): boolean {
    return this.isInitialized && 
           this.databaseService.isHealthy() && 
           this.redisService.isHealthy();
  }
}


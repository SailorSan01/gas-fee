import { DatabaseService, PolicyRule } from './database';
import { RedisService } from './redis';
import { MetaTransactionRequest } from './relayer';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export interface AllowlistRule {
  addresses: string[];
}

export interface QuotaRule {
  maxTransactionsPerHour: number;
  maxTransactionsPerDay: number;
  maxValuePerTransaction: string;
  maxValuePerHour: string;
  maxValuePerDay: string;
}

export interface GasLimitRule {
  maxGasLimit: string;
  maxGasPrice: string;
}

export interface TokenLimitRule {
  allowedTokens: string[];
  maxAmountPerTransaction: { [tokenAddress: string]: string };
  maxAmountPerHour: { [tokenAddress: string]: string };
  maxAmountPerDay: { [tokenAddress: string]: string };
}

export class PolicyEngine {
  private allowlistRules: Map<string, AllowlistRule> = new Map();
  private quotaRules: Map<string, QuotaRule> = new Map();
  private gasLimitRules: Map<string, GasLimitRule> = new Map();
  private tokenLimitRules: Map<string, TokenLimitRule> = new Map();
  private isInitialized = false;

  constructor(
    private databaseService: DatabaseService,
    private redisService: RedisService
  ) {}

  public async initialize(): Promise<void> {
    try {
      await this.loadPolicyRules();
      this.isInitialized = true;
      logger.info('✅ PolicyEngine initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize PolicyEngine:', error);
      throw error;
    }
  }

  public async checkPolicies(request: MetaTransactionRequest): Promise<PolicyResult> {
    if (!this.isInitialized) {
      throw new Error('PolicyEngine not initialized');
    }

    try {
      // Check allowlist
      const allowlistResult = await this.checkAllowlist(request);
      if (!allowlistResult.allowed) {
        return allowlistResult;
      }

      // Check quotas
      const quotaResult = await this.checkQuotas(request);
      if (!quotaResult.allowed) {
        return quotaResult;
      }

      // Check gas limits
      const gasLimitResult = await this.checkGasLimits(request);
      if (!gasLimitResult.allowed) {
        return gasLimitResult;
      }

      // Check token limits
      const tokenLimitResult = await this.checkTokenLimits(request);
      if (!tokenLimitResult.allowed) {
        return tokenLimitResult;
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking policies:', error);
      return {
        allowed: false,
        reason: 'Policy check failed'
      };
    }
  }

  private async checkAllowlist(request: MetaTransactionRequest): Promise<PolicyResult> {
    // Check global allowlist
    const globalRule = this.allowlistRules.get('*');
    if (globalRule) {
      const isAllowed = globalRule.addresses.some(
        addr => addr.toLowerCase() === request.from.toLowerCase()
      );
      
      if (!isAllowed) {
        return {
          allowed: false,
          reason: 'Address not in global allowlist'
        };
      }
    }

    // Check network-specific allowlist
    const networkRule = this.allowlistRules.get(request.network);
    if (networkRule) {
      const isAllowed = networkRule.addresses.some(
        addr => addr.toLowerCase() === request.from.toLowerCase()
      );
      
      if (!isAllowed) {
        return {
          allowed: false,
          reason: `Address not in ${request.network} allowlist`
        };
      }
    }

    return { allowed: true };
  }

  private async checkQuotas(request: MetaTransactionRequest): Promise<PolicyResult> {
    const address = request.from.toLowerCase();
    
    // Check global quotas
    const globalRule = this.quotaRules.get('*');
    if (globalRule) {
      const quotaResult = await this.checkAddressQuota(address, request, globalRule);
      if (!quotaResult.allowed) {
        return quotaResult;
      }
    }

    // Check address-specific quotas
    const addressRule = this.quotaRules.get(address);
    if (addressRule) {
      const quotaResult = await this.checkAddressQuota(address, request, addressRule);
      if (!quotaResult.allowed) {
        return quotaResult;
      }
    }

    return { allowed: true };
  }

  private async checkAddressQuota(
    address: string, 
    request: MetaTransactionRequest, 
    rule: QuotaRule
  ): Promise<PolicyResult> {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    // Check transaction count limits
    const hourlyTxCount = await this.getTransactionCount(address, request.network, oneHour);
    if (hourlyTxCount >= rule.maxTransactionsPerHour) {
      return {
        allowed: false,
        reason: 'Hourly transaction limit exceeded'
      };
    }

    const dailyTxCount = await this.getTransactionCount(address, request.network, oneDay);
    if (dailyTxCount >= rule.maxTransactionsPerDay) {
      return {
        allowed: false,
        reason: 'Daily transaction limit exceeded'
      };
    }

    // Check value limits
    const txValue = BigInt(request.value);
    const maxTxValue = BigInt(rule.maxValuePerTransaction);
    
    if (txValue > maxTxValue) {
      return {
        allowed: false,
        reason: 'Transaction value exceeds limit'
      };
    }

    const hourlyValue = await this.getTransactionValue(address, request.network, oneHour);
    const maxHourlyValue = BigInt(rule.maxValuePerHour);
    
    if (hourlyValue + txValue > maxHourlyValue) {
      return {
        allowed: false,
        reason: 'Hourly value limit would be exceeded'
      };
    }

    const dailyValue = await this.getTransactionValue(address, request.network, oneDay);
    const maxDailyValue = BigInt(rule.maxValuePerDay);
    
    if (dailyValue + txValue > maxDailyValue) {
      return {
        allowed: false,
        reason: 'Daily value limit would be exceeded'
      };
    }

    return { allowed: true };
  }

  private async checkGasLimits(request: MetaTransactionRequest): Promise<PolicyResult> {
    // Check global gas limits
    const globalRule = this.gasLimitRules.get('*');
    if (globalRule) {
      const gasLimit = BigInt(request.gas);
      const maxGasLimit = BigInt(globalRule.maxGasLimit);
      
      if (gasLimit > maxGasLimit) {
        return {
          allowed: false,
          reason: 'Gas limit exceeds maximum allowed'
        };
      }
    }

    // Check network-specific gas limits
    const networkRule = this.gasLimitRules.get(request.network);
    if (networkRule) {
      const gasLimit = BigInt(request.gas);
      const maxGasLimit = BigInt(networkRule.maxGasLimit);
      
      if (gasLimit > maxGasLimit) {
        return {
          allowed: false,
          reason: `Gas limit exceeds ${request.network} maximum`
        };
      }
    }

    return { allowed: true };
  }

  private async checkTokenLimits(request: MetaTransactionRequest): Promise<PolicyResult> {
    if (!request.tokenAddress || !request.amount) {
      return { allowed: true }; // No token involved
    }

    const tokenAddress = request.tokenAddress.toLowerCase();
    
    // Check global token limits
    const globalRule = this.tokenLimitRules.get('*');
    if (globalRule) {
      if (globalRule.allowedTokens.length > 0) {
        const isAllowed = globalRule.allowedTokens.some(
          addr => addr.toLowerCase() === tokenAddress
        );
        
        if (!isAllowed) {
          return {
            allowed: false,
            reason: 'Token not in allowed list'
          };
        }
      }

      const tokenLimitResult = await this.checkTokenAmountLimits(
        request.from, 
        tokenAddress, 
        request.amount, 
        request.network, 
        globalRule
      );
      
      if (!tokenLimitResult.allowed) {
        return tokenLimitResult;
      }
    }

    return { allowed: true };
  }

  private async checkTokenAmountLimits(
    address: string,
    tokenAddress: string,
    amount: string,
    network: string,
    rule: TokenLimitRule
  ): Promise<PolicyResult> {
    const txAmount = BigInt(amount);
    
    // Check per-transaction limit
    const maxTxAmount = rule.maxAmountPerTransaction[tokenAddress];
    if (maxTxAmount && txAmount > BigInt(maxTxAmount)) {
      return {
        allowed: false,
        reason: 'Token amount exceeds per-transaction limit'
      };
    }

    // Check hourly limit
    const oneHour = 60 * 60 * 1000;
    const hourlyAmount = await this.getTokenTransactionAmount(
      address, 
      tokenAddress, 
      network, 
      oneHour
    );
    
    const maxHourlyAmount = rule.maxAmountPerHour[tokenAddress];
    if (maxHourlyAmount && hourlyAmount + txAmount > BigInt(maxHourlyAmount)) {
      return {
        allowed: false,
        reason: 'Token hourly limit would be exceeded'
      };
    }

    // Check daily limit
    const oneDay = 24 * oneHour;
    const dailyAmount = await this.getTokenTransactionAmount(
      address, 
      tokenAddress, 
      network, 
      oneDay
    );
    
    const maxDailyAmount = rule.maxAmountPerDay[tokenAddress];
    if (maxDailyAmount && dailyAmount + txAmount > BigInt(maxDailyAmount)) {
      return {
        allowed: false,
        reason: 'Token daily limit would be exceeded'
      };
    }

    return { allowed: true };
  }

  private async getTransactionCount(address: string, network: string, timeWindowMs: number): Promise<number> {
    const key = `tx_count:${network}:${address}`;
    const windowStart = Date.now() - timeWindowMs;
    
    try {
      // Use Redis sorted set to count transactions in time window
      const client = (this.redisService as any).client;
      await client.zRemRangeByScore(key, 0, windowStart);
      return await client.zCard(key);
    } catch (error) {
      logger.error('Error getting transaction count:', error);
      return 0;
    }
  }

  private async getTransactionValue(address: string, network: string, timeWindowMs: number): Promise<bigint> {
    // This would typically query the database for transaction values in the time window
    // For now, return 0 as a placeholder
    return BigInt(0);
  }

  private async getTokenTransactionAmount(
    address: string, 
    tokenAddress: string, 
    network: string, 
    timeWindowMs: number
  ): Promise<bigint> {
    // This would typically query the database for token transaction amounts in the time window
    // For now, return 0 as a placeholder
    return BigInt(0);
  }

  public async loadPolicyRules(): Promise<void> {
    try {
      const rules = await this.databaseService.getPolicyRules();
      
      // Clear existing rules
      this.allowlistRules.clear();
      this.quotaRules.clear();
      this.gasLimitRules.clear();
      this.tokenLimitRules.clear();

      // Load rules by type
      for (const rule of rules) {
        const value = JSON.parse(rule.value);
        
        switch (rule.rule_type) {
          case 'allowlist':
            this.allowlistRules.set(rule.target, value as AllowlistRule);
            break;
          case 'quota':
            this.quotaRules.set(rule.target, value as QuotaRule);
            break;
          case 'gas_limit':
            this.gasLimitRules.set(rule.target, value as GasLimitRule);
            break;
          case 'token_limit':
            this.tokenLimitRules.set(rule.target, value as TokenLimitRule);
            break;
        }
      }

      logger.info(`Loaded ${rules.length} policy rules`);
    } catch (error) {
      logger.error('Error loading policy rules:', error);
      throw error;
    }
  }

  public async addPolicyRule(rule: PolicyRule): Promise<void> {
    try {
      await this.databaseService.savePolicyRule(rule);
      await this.loadPolicyRules(); // Reload all rules
      logger.info(`Added policy rule: ${rule.rule_type} for ${rule.target}`);
    } catch (error) {
      logger.error('Error adding policy rule:', error);
      throw error;
    }
  }

  public async updatePolicyRule(id: number, updates: Partial<PolicyRule>): Promise<void> {
    try {
      await this.databaseService.updatePolicyRule(id, updates);
      await this.loadPolicyRules(); // Reload all rules
      logger.info(`Updated policy rule ${id}`);
    } catch (error) {
      logger.error('Error updating policy rule:', error);
      throw error;
    }
  }

  public async deletePolicyRule(id: number): Promise<void> {
    try {
      await this.databaseService.deletePolicyRule(id);
      await this.loadPolicyRules(); // Reload all rules
      logger.info(`Deleted policy rule ${id}`);
    } catch (error) {
      logger.error('Error deleting policy rule:', error);
      throw error;
    }
  }

  public getPolicyRules(): {
    allowlist: Map<string, AllowlistRule>;
    quota: Map<string, QuotaRule>;
    gasLimit: Map<string, GasLimitRule>;
    tokenLimit: Map<string, TokenLimitRule>;
  } {
    return {
      allowlist: this.allowlistRules,
      quota: this.quotaRules,
      gasLimit: this.gasLimitRules,
      tokenLimit: this.tokenLimitRules
    };
  }
}


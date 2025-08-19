import { createClient, RedisClientType } from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    // Handle Redis events
    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis Client Ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      logger.info('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('✅ Redis connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('✅ Redis disconnected successfully');
    } catch (error) {
      logger.error('❌ Error disconnecting from Redis:', error);
      throw error;
    }
  }

  // Nonce management methods
  public async getNextNonce(address: string, network: string): Promise<number> {
    const key = this.getKey(`nonce:${network}:${address.toLowerCase()}`);
    
    try {
      const nonce = await this.client.incr(key);
      
      // Set expiration to 1 hour to prevent stale nonces
      await this.client.expire(key, 3600);
      
      return nonce - 1; // Redis INCR returns the incremented value, we want the previous value
    } catch (error) {
      logger.error('Error getting next nonce:', error);
      throw error;
    }
  }

  public async setNonce(address: string, network: string, nonce: number): Promise<void> {
    const key = this.getKey(`nonce:${network}:${address.toLowerCase()}`);
    
    try {
      await this.client.set(key, nonce.toString());
      await this.client.expire(key, 3600);
    } catch (error) {
      logger.error('Error setting nonce:', error);
      throw error;
    }
  }

  public async getCurrentNonce(address: string, network: string): Promise<number | null> {
    const key = this.getKey(`nonce:${network}:${address.toLowerCase()}`);
    
    try {
      const nonce = await this.client.get(key);
      return nonce ? parseInt(nonce, 10) : null;
    } catch (error) {
      logger.error('Error getting current nonce:', error);
      throw error;
    }
  }

  // Rate limiting methods
  public async checkRateLimit(identifier: string, windowMs: number, maxRequests: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(`rate_limit:${identifier}`);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    try {
      // Use a sorted set to track requests in the time window
      await this.client.zRemRangeByScore(key, 0, windowStart);
      
      const currentCount = await this.client.zCard(key);
      
      if (currentCount >= maxRequests) {
        const oldestRequest = await this.client.zRange(key, 0, 0, { BY: 'SCORE' });
        const resetTime = oldestRequest.length > 0 ? 
          parseInt(oldestRequest[0]) + windowMs : 
          now + windowMs;
        
        return {
          allowed: false,
          remaining: 0,
          resetTime
        };
      }
      
      // Add current request
      await this.client.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      await this.client.expire(key, Math.ceil(windowMs / 1000));
      
      return {
        allowed: true,
        remaining: maxRequests - currentCount - 1,
        resetTime: now + windowMs
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      // In case of Redis error, allow the request but log the error
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }
  }

  // Transaction tracking methods
  public async trackPendingTransaction(txHash: string, data: any, ttlSeconds = 3600): Promise<void> {
    const key = this.getKey(`pending_tx:${txHash}`);
    
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
    } catch (error) {
      logger.error('Error tracking pending transaction:', error);
      throw error;
    }
  }

  public async getPendingTransaction(txHash: string): Promise<any | null> {
    const key = this.getKey(`pending_tx:${txHash}`);
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Error getting pending transaction:', error);
      return null;
    }
  }

  public async removePendingTransaction(txHash: string): Promise<void> {
    const key = this.getKey(`pending_tx:${txHash}`);
    
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Error removing pending transaction:', error);
    }
  }

  public async getAllPendingTransactions(): Promise<string[]> {
    const pattern = this.getKey('pending_tx:*');
    
    try {
      const keys = await this.client.keys(pattern);
      return keys.map(key => key.replace(this.getKey('pending_tx:'), ''));
    } catch (error) {
      logger.error('Error getting all pending transactions:', error);
      return [];
    }
  }

  // Cache methods
  public async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const redisKey = this.getKey(key);
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    try {
      if (ttlSeconds) {
        await this.client.setEx(redisKey, ttlSeconds, serializedValue);
      } else {
        await this.client.set(redisKey, serializedValue);
      }
    } catch (error) {
      logger.error('Error setting cache value:', error);
      throw error;
    }
  }

  public async get(key: string): Promise<any | null> {
    const redisKey = this.getKey(key);
    
    try {
      const value = await this.client.get(redisKey);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not JSON
      }
    } catch (error) {
      logger.error('Error getting cache value:', error);
      return null;
    }
  }

  public async del(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    
    try {
      await this.client.del(redisKey);
    } catch (error) {
      logger.error('Error deleting cache value:', error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    const redisKey = this.getKey(key);
    
    try {
      const result = await this.client.exists(redisKey);
      return result === 1;
    } catch (error) {
      logger.error('Error checking key existence:', error);
      return false;
    }
  }

  // Utility methods
  private getKey(key: string): string {
    return `${config.redis.keyPrefix}${key}`;
  }

  public async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      logger.info('Redis cache flushed');
    } catch (error) {
      logger.error('Error flushing Redis cache:', error);
      throw error;
    }
  }

  public async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      logger.error('Error getting Redis info:', error);
      return null;
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}


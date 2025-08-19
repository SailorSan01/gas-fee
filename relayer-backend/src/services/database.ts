import { Pool, PoolClient } from 'pg';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface TransactionRecord {
  id?: number;
  tx_hash: string;
  from_address: string;
  to_address: string;
  network: string;
  status: 'pending' | 'confirmed' | 'failed';
  gas_used?: string;
  gas_price?: string;
  block_number?: number;
  created_at?: Date;
  updated_at?: Date;
  meta_tx_hash?: string;
  relayer_address?: string;
  token_address?: string;
  token_type?: 'ERC20' | 'ERC721' | 'ERC1155';
  amount?: string;
  token_id?: string;
}

export interface PolicyRule {
  id?: number;
  rule_type: 'allowlist' | 'quota' | 'gas_limit' | 'token_limit';
  target: string; // address, token address, or '*' for global
  value: string; // JSON string with rule parameters
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class DatabaseService {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl,
      max: config.database.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  public async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      
      // Initialize database schema
      await this.initializeSchema();
      
      this.isConnected = true;
      logger.info('✅ Database connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('✅ Database disconnected successfully');
    } catch (error) {
      logger.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  private async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Create transactions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          tx_hash VARCHAR(66) UNIQUE NOT NULL,
          from_address VARCHAR(42) NOT NULL,
          to_address VARCHAR(42) NOT NULL,
          network VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          gas_used VARCHAR(20),
          gas_price VARCHAR(30),
          block_number INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          meta_tx_hash VARCHAR(66),
          relayer_address VARCHAR(42),
          token_address VARCHAR(42),
          token_type VARCHAR(10),
          amount VARCHAR(78),
          token_id VARCHAR(78)
        );
      `);

      // Create policy_rules table
      await client.query(`
        CREATE TABLE IF NOT EXISTS policy_rules (
          id SERIAL PRIMARY KEY,
          rule_type VARCHAR(20) NOT NULL,
          target VARCHAR(42) NOT NULL,
          value TEXT NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
        CREATE INDEX IF NOT EXISTS idx_transactions_network ON transactions(network);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_policy_rules_target ON policy_rules(target);
        CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON policy_rules(rule_type);
      `);

      // Create updated_at trigger function
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create triggers
      await client.query(`
        DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
        CREATE TRIGGER update_transactions_updated_at
          BEFORE UPDATE ON transactions
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_policy_rules_updated_at ON policy_rules;
        CREATE TRIGGER update_policy_rules_updated_at
          BEFORE UPDATE ON policy_rules
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);

      logger.info('✅ Database schema initialized');
    } finally {
      client.release();
    }
  }

  // Transaction methods
  public async saveTransaction(transaction: TransactionRecord): Promise<TransactionRecord> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO transactions (
          tx_hash, from_address, to_address, network, status,
          gas_used, gas_price, block_number, meta_tx_hash,
          relayer_address, token_address, token_type, amount, token_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;
      
      const values = [
        transaction.tx_hash,
        transaction.from_address,
        transaction.to_address,
        transaction.network,
        transaction.status,
        transaction.gas_used,
        transaction.gas_price,
        transaction.block_number,
        transaction.meta_tx_hash,
        transaction.relayer_address,
        transaction.token_address,
        transaction.token_type,
        transaction.amount,
        transaction.token_id
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  public async updateTransaction(txHash: string, updates: Partial<TransactionRecord>): Promise<TransactionRecord | null> {
    const client = await this.pool.connect();
    
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE transactions 
        SET ${setClause}
        WHERE tx_hash = $1
        RETURNING *;
      `;
      
      const values = [txHash, ...Object.values(updates)];
      const result = await client.query(query, values);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  public async getTransaction(txHash: string): Promise<TransactionRecord | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM transactions WHERE tx_hash = $1';
      const result = await client.query(query, [txHash]);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  public async getTransactionsByAddress(address: string, limit = 100): Promise<TransactionRecord[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM transactions 
        WHERE from_address = $1 OR to_address = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [address, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async getPendingTransactions(): Promise<TransactionRecord[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM transactions 
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Policy methods
  public async savePolicyRule(rule: PolicyRule): Promise<PolicyRule> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO policy_rules (rule_type, target, value, enabled)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      
      const values = [rule.rule_type, rule.target, rule.value, rule.enabled];
      const result = await client.query(query, values);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  public async getPolicyRules(ruleType?: string): Promise<PolicyRule[]> {
    const client = await this.pool.connect();
    
    try {
      let query = 'SELECT * FROM policy_rules WHERE enabled = true';
      const values: any[] = [];
      
      if (ruleType) {
        query += ' AND rule_type = $1';
        values.push(ruleType);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  public async updatePolicyRule(id: number, updates: Partial<PolicyRule>): Promise<PolicyRule | null> {
    const client = await this.pool.connect();
    
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE policy_rules 
        SET ${setClause}
        WHERE id = $1
        RETURNING *;
      `;
      
      const values = [id, ...Object.values(updates)];
      const result = await client.query(query, values);
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  public async deletePolicyRule(id: number): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM policy_rules WHERE id = $1';
      const result = await client.query(query, [id]);
      
      return result.rowCount !== null && result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  // Analytics methods
  public async getTransactionStats(timeframe: '1h' | '24h' | '7d' = '24h'): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      let interval = '24 hours';
      if (timeframe === '1h') interval = '1 hour';
      if (timeframe === '7d') interval = '7 days';
      
      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_transactions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
          AVG(CASE WHEN gas_used IS NOT NULL THEN gas_used::bigint END) as avg_gas_used,
          SUM(CASE WHEN gas_used IS NOT NULL THEN gas_used::bigint END) as total_gas_used
        FROM transactions 
        WHERE created_at >= NOW() - INTERVAL '${interval}'
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}


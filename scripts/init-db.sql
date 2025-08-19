-- Database initialization script for Gas-Fee Sponsor Relayer Bot
-- This script creates the necessary tables and indexes

-- Create transactions table
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

-- Create policy_rules table
CREATE TABLE IF NOT EXISTS policy_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(20) NOT NULL,
    target VARCHAR(42) NOT NULL,
    value TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_network ON transactions(network);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_policy_rules_target ON policy_rules(target);
CREATE INDEX IF NOT EXISTS idx_policy_rules_type ON policy_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_policy_rules_enabled ON policy_rules(enabled);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policy_rules_updated_at ON policy_rules;
CREATE TRIGGER update_policy_rules_updated_at
    BEFORE UPDATE ON policy_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default policy rules
INSERT INTO policy_rules (rule_type, target, value, enabled) VALUES
(
    'allowlist',
    '*',
    '{"addresses": ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"]}',
    true
),
(
    'quota',
    '*',
    '{"maxTransactionsPerHour": 100, "maxTransactionsPerDay": 1000, "maxValuePerTransaction": "1000000000000000000", "maxValuePerHour": "10000000000000000000", "maxValuePerDay": "100000000000000000000"}',
    true
),
(
    'gas_limit',
    '*',
    '{"maxGasLimit": "500000", "maxGasPrice": "100000000000"}',
    true
)
ON CONFLICT DO NOTHING;

-- Create a view for transaction statistics
CREATE OR REPLACE VIEW transaction_stats AS
SELECT 
    network,
    status,
    COUNT(*) as count,
    AVG(CASE WHEN gas_used IS NOT NULL THEN gas_used::bigint END) as avg_gas_used,
    SUM(CASE WHEN gas_used IS NOT NULL THEN gas_used::bigint END) as total_gas_used,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions
GROUP BY network, status;

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO relayer_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO relayer_user;

-- Log successful initialization
INSERT INTO transactions (
    tx_hash, 
    from_address, 
    to_address, 
    network, 
    status,
    meta_tx_hash
) VALUES (
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    'system',
    'confirmed',
    'database_initialized'
) ON CONFLICT DO NOTHING;


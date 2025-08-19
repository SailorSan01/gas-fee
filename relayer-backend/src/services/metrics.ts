import { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

export class MetricsService {
  // Transaction metrics
  private transactionCounter: Counter<string>;
  private transactionDuration: Histogram<string>;
  private gasUsedHistogram: Histogram<string>;
  private transactionValue: Histogram<string>;

  // System metrics
  private activeConnections: Gauge<string>;
  private queueSize: Gauge<string>;
  private errorRate: Counter<string>;

  // Network metrics
  private networkLatency: Histogram<string>;
  private gasPrice: Gauge<string>;

  constructor() {
    // Initialize transaction metrics
    this.transactionCounter = new Counter({
      name: 'relayer_transactions_total',
      help: 'Total number of transactions processed',
      labelNames: ['network', 'status', 'token_type']
    });

    this.transactionDuration = new Histogram({
      name: 'relayer_transaction_duration_seconds',
      help: 'Time taken to process transactions',
      labelNames: ['network', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.gasUsedHistogram = new Histogram({
      name: 'relayer_gas_used',
      help: 'Gas used by transactions',
      labelNames: ['network', 'token_type'],
      buckets: [21000, 50000, 100000, 200000, 500000, 1000000, 2000000]
    });

    this.transactionValue = new Histogram({
      name: 'relayer_transaction_value_wei',
      help: 'Value of transactions in wei',
      labelNames: ['network', 'token_type'],
      buckets: [1e15, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21] // 0.001 ETH to 1000 ETH
    });

    // Initialize system metrics
    this.activeConnections = new Gauge({
      name: 'relayer_active_connections',
      help: 'Number of active connections'
    });

    this.queueSize = new Gauge({
      name: 'relayer_queue_size',
      help: 'Number of transactions in queue',
      labelNames: ['queue_type']
    });

    this.errorRate = new Counter({
      name: 'relayer_errors_total',
      help: 'Total number of errors',
      labelNames: ['error_type', 'network']
    });

    // Initialize network metrics
    this.networkLatency = new Histogram({
      name: 'relayer_network_latency_seconds',
      help: 'Network latency for RPC calls',
      labelNames: ['network', 'method'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.gasPrice = new Gauge({
      name: 'relayer_gas_price_gwei',
      help: 'Current gas price in gwei',
      labelNames: ['network']
    });

    logger.info('✅ MetricsService initialized');
  }

  // Transaction metrics methods
  public recordTransaction(network: string, status: 'success' | 'failed', tokenType?: string): void {
    this.transactionCounter.inc({
      network,
      status,
      token_type: tokenType || 'native'
    });
  }

  public recordTransactionDuration(network: string, status: string, durationMs: number): void {
    this.transactionDuration.observe(
      { network, status },
      durationMs / 1000 // Convert to seconds
    );
  }

  public recordGasUsed(network: string, gasUsed: string, tokenType?: string): void {
    const gasUsedNumber = parseInt(gasUsed, 10);
    if (!isNaN(gasUsedNumber)) {
      this.gasUsedHistogram.observe({
        network,
        token_type: tokenType || 'native'
      }, gasUsedNumber);
    }
  }

  public recordTransactionValue(network: string, value: string, tokenType?: string): void {
    const valueNumber = parseFloat(value);
    if (!isNaN(valueNumber)) {
      this.transactionValue.observe({
        network,
        token_type: tokenType || 'native'
      }, valueNumber);
    }
  }

  // System metrics methods
  public setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  public setQueueSize(queueType: string, size: number): void {
    this.queueSize.set({ queue_type: queueType }, size);
  }

  public recordError(errorType: string, network?: string): void {
    this.errorRate.inc({
      error_type: errorType,
      network: network || 'unknown'
    });
  }

  // Network metrics methods
  public recordNetworkLatency(network: string, method: string, latencyMs: number): void {
    this.networkLatency.observe(
      { network, method },
      latencyMs / 1000 // Convert to seconds
    );
  }

  public setGasPrice(network: string, gasPriceWei: string): void {
    const gasPriceNumber = parseFloat(gasPriceWei);
    if (!isNaN(gasPriceNumber)) {
      const gasPriceGwei = gasPriceNumber / 1e9; // Convert wei to gwei
      this.gasPrice.set({ network }, gasPriceGwei);
    }
  }

  // Convenience methods
  public recordLatency(latencyMs: number): void {
    // Record overall latency without network-specific labels
    this.recordTransactionDuration('all', 'completed', latencyMs);
  }

  public incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  public decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  // Get metrics for API endpoints
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getMetricsAsJson(): any {
    const metrics = register.getMetricsAsJSON();
    
    // Transform metrics into a more readable format
    const result: any = {
      transactions: {},
      system: {},
      network: {},
      timestamp: new Date().toISOString()
    };

    for (const metric of metrics) {
      switch (metric.name) {
        case 'relayer_transactions_total':
          result.transactions.total = metric.values;
          break;
        case 'relayer_transaction_duration_seconds':
          result.transactions.duration = metric.values;
          break;
        case 'relayer_gas_used':
          result.transactions.gasUsed = metric.values;
          break;
        case 'relayer_transaction_value_wei':
          result.transactions.value = metric.values;
          break;
        case 'relayer_active_connections':
          result.system.activeConnections = metric.values[0]?.value || 0;
          break;
        case 'relayer_queue_size':
          result.system.queueSize = metric.values;
          break;
        case 'relayer_errors_total':
          result.system.errors = metric.values;
          break;
        case 'relayer_network_latency_seconds':
          result.network.latency = metric.values;
          break;
        case 'relayer_gas_price_gwei':
          result.network.gasPrice = metric.values;
          break;
      }
    }

    return result;
  }

  // Health check method
  public getHealthMetrics(): any {
    const metrics = this.getMetricsAsJson();
    
    return {
      healthy: true,
      activeConnections: metrics.system.activeConnections || 0,
      totalTransactions: this.getTotalTransactionCount(metrics.transactions.total),
      errorRate: this.calculateErrorRate(metrics.transactions.total, metrics.system.errors),
      timestamp: new Date().toISOString()
    };
  }

  private getTotalTransactionCount(transactionMetrics: any[]): number {
    if (!transactionMetrics) return 0;
    
    return transactionMetrics.reduce((total, metric) => {
      return total + (metric.value || 0);
    }, 0);
  }

  private calculateErrorRate(transactionMetrics: any[], errorMetrics: any[]): number {
    const totalTransactions = this.getTotalTransactionCount(transactionMetrics);
    
    if (totalTransactions === 0) return 0;
    
    const totalErrors = errorMetrics ? errorMetrics.reduce((total, metric) => {
      return total + (metric.value || 0);
    }, 0) : 0;
    
    return (totalErrors / totalTransactions) * 100;
  }

  // Reset metrics (useful for testing)
  public reset(): void {
    register.clear();
    logger.info('📊 Metrics reset');
  }
}


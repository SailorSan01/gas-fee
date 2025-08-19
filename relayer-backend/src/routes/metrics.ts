import { Router, Request, Response } from 'express';
import { metricsEndpoint } from '../middleware/metrics';
import { logger } from '../utils/logger';

const router = Router();

// Prometheus metrics endpoint
router.get('/', metricsEndpoint);

// JSON metrics endpoint for easier consumption
router.get('/json', async (req: Request, res: Response) => {
  try {
    // TODO: This would require access to the MetricsService instance
    // For now, return basic metrics structure
    const metrics = {
      timestamp: new Date().toISOString(),
      transactions: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      },
      networks: {
        ethereum: { transactions: 0, gasUsed: 0 },
        bsc: { transactions: 0, gasUsed: 0 },
        polygon: { transactions: 0, gasUsed: 0 },
        localhost: { transactions: 0, gasUsed: 0 }
      }
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Error generating JSON metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics'
    });
  }
});

// System metrics endpoint
router.get('/system', async (req: Request, res: Response) => {
  try {
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
        usage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
      },
      platform: {
        type: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    res.json(systemMetrics);
  } catch (error) {
    logger.error('Error generating system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate system metrics'
    });
  }
});

// Transaction metrics endpoint
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    // TODO: This would require access to the DatabaseService instance
    // For now, return basic transaction metrics structure
    const transactionMetrics = {
      timestamp: new Date().toISOString(),
      total: 0,
      byStatus: {
        pending: 0,
        confirmed: 0,
        failed: 0
      },
      byNetwork: {
        ethereum: 0,
        bsc: 0,
        polygon: 0,
        localhost: 0
      },
      byTokenType: {
        native: 0,
        ERC20: 0,
        ERC721: 0,
        ERC1155: 0
      },
      timeframes: {
        lastHour: 0,
        last24Hours: 0,
        last7Days: 0
      }
    };

    res.json(transactionMetrics);
  } catch (error) {
    logger.error('Error generating transaction metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate transaction metrics'
    });
  }
});

// Gas metrics endpoint
router.get('/gas', async (req: Request, res: Response) => {
  try {
    const gasMetrics = {
      timestamp: new Date().toISOString(),
      byNetwork: {
        ethereum: {
          currentGasPrice: 0,
          averageGasUsed: 0,
          totalGasUsed: 0,
          gasCost: 0
        },
        bsc: {
          currentGasPrice: 0,
          averageGasUsed: 0,
          totalGasUsed: 0,
          gasCost: 0
        },
        polygon: {
          currentGasPrice: 0,
          averageGasUsed: 0,
          totalGasUsed: 0,
          gasCost: 0
        },
        localhost: {
          currentGasPrice: 0,
          averageGasUsed: 0,
          totalGasUsed: 0,
          gasCost: 0
        }
      },
      trends: {
        gasPriceHistory: [],
        gasUsageHistory: []
      }
    };

    res.json(gasMetrics);
  } catch (error) {
    logger.error('Error generating gas metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate gas metrics'
    });
  }
});

export { router as metricsRoutes };


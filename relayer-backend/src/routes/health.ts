import { Router, Request, Response } from 'express';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.server.env,
      services: {
        database: 'unknown',
        redis: 'unknown',
        relayer: 'unknown'
      }
    };

    // TODO: Add actual service health checks
    // This would require access to the service instances
    // For now, return basic health status

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.server.env,
      system: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss
        },
        cpu: {
          usage: process.cpuUsage()
        },
        platform: process.platform,
        nodeVersion: process.version
      },
      services: {
        database: {
          status: 'unknown',
          latency: null,
          connections: null
        },
        redis: {
          status: 'unknown',
          latency: null,
          memory: null
        },
        relayer: {
          status: 'unknown',
          networks: [],
          pendingTransactions: 0
        }
      },
      configuration: {
        networks: Object.keys(config.blockchain.networks),
        signerType: config.relayer.signerType,
        flashbotsEnabled: config.relayer.flashbots.enabled,
        metricsEnabled: config.monitoring.metricsEnabled
      }
    };

    res.json(health);
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed'
    });
  }
});

// Readiness probe (for Kubernetes)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    // TODO: Implement actual readiness checks
    
    const ready = {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        database: true,
        redis: true,
        relayer: true
      }
    };

    res.json(ready);
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Service not ready'
    });
  }
});

// Liveness probe (for Kubernetes)
router.get('/live', async (req: Request, res: Response) => {
  try {
    // Basic liveness check - if we can respond, we're alive
    res.json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Liveness check failed:', error);
    res.status(503).json({
      alive: false,
      timestamp: new Date().toISOString(),
      error: 'Service not alive'
    });
  }
});

export { router as healthRoutes };


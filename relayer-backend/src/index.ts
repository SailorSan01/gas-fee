import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';

import { logger } from './utils/logger';
import { config } from './config/config';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware } from './middleware/metrics';
import { relayerRoutes } from './routes/relayer';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { DatabaseService } from './services/database';
import { RedisService } from './services/redis';
import { RelayerService } from './services/relayer';

// Load environment variables
dotenv.config();

class RelayerBackend {
  private app: express.Application;
  private server: any;
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private relayerService: RelayerService;

  constructor() {
    this.app = express();
    this.databaseService = new DatabaseService();
    this.redisService = new RedisService();
    this.relayerService = new RelayerService(this.databaseService, this.redisService);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS - Allow all origins for development
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: false
    }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Metrics middleware
    this.app.use(metricsMiddleware);
  }

  private setupRoutes(): void {
    // Health check routes
    this.app.use('/health', healthRoutes);
    
    // Metrics routes
    this.app.use('/metrics', metricsRoutes);
    
    // Main relayer routes
    this.app.use('/api/v1', relayerRoutes(this.relayerService));

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Gas-Fee Sponsor Relayer Backend',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.databaseService.connect();
      await this.redisService.connect();
      await this.relayerService.initialize();

      // Start HTTP server
      this.server = createServer(this.app);
      
      const port = config.server.port;
      const host = config.server.host;

      this.server.listen(port, host, () => {
        logger.info(`🚀 Relayer Backend started on ${host}:${port}`);
        logger.info(`📊 Metrics available at http://${host}:${port}/metrics`);
        logger.info(`🏥 Health check at http://${host}:${port}/health`);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start relayer backend:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down relayer backend...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => resolve());
        });
      }

      // Close services
      await this.relayerService.shutdown();
      await this.redisService.disconnect();
      await this.databaseService.disconnect();

      logger.info('✅ Relayer backend shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the application
const relayerBackend = new RelayerBackend();
relayerBackend.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

export { RelayerBackend };


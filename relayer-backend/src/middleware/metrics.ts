import { Request, Response, NextFunction } from 'express';
import { register } from 'prom-client';

// Create metrics for HTTP requests
const httpRequestDuration = new (require('prom-client').Histogram)({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new (require('prom-client').Counter)({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestSize = new (require('prom-client').Histogram)({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

const httpResponseSize = new (require('prom-client').Histogram)({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000]
});

const activeConnections = new (require('prom-client').Gauge)({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Track active connections
let connectionCount = 0;

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Increment active connections
  connectionCount++;
  activeConnections.set(connectionCount);

  // Get route pattern (remove query parameters and dynamic segments)
  const route = getRoutePattern(req.path);
  
  // Track request size
  const requestSize = parseInt(req.get('content-length') || '0', 10);
  httpRequestSize.observe({
    method: req.method,
    route: route
  }, requestSize);

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    // Calculate duration
    const duration = (Date.now() - startTime) / 1000;
    
    // Get response size
    const responseSize = res.get('content-length') ? 
      parseInt(res.get('content-length')!, 10) : 
      (chunk ? Buffer.byteLength(chunk, encoding) : 0);

    // Record metrics
    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    }, duration);

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    });

    httpResponseSize.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode.toString()
    }, responseSize);

    // Decrement active connections
    connectionCount--;
    activeConnections.set(connectionCount);

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Helper function to normalize route patterns
function getRoutePattern(path: string): string {
  // Remove query parameters
  const pathWithoutQuery = path.split('?')[0];
  
  // Normalize common patterns
  let route = pathWithoutQuery
    // Replace UUIDs and hashes with placeholder
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/0x[0-9a-f]{40,}/gi, '/:address')
    .replace(/\/0x[0-9a-f]{64}/gi, '/:hash')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace common dynamic segments
    .replace(/\/[a-f0-9]{24}/g, '/:id') // MongoDB ObjectId
    .replace(/\/[a-zA-Z0-9_-]{10,}/g, '/:id'); // Generic long IDs

  // Limit route length to prevent cardinality explosion
  if (route.length > 100) {
    route = route.substring(0, 100) + '...';
  }

  return route || '/';
}

// Middleware to expose metrics endpoint
export const metricsEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics'
    });
  }
};

// Health check metrics
export const healthMetrics = {
  getConnectionCount: () => connectionCount,
  getMetricsRegistry: () => register
};


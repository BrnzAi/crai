import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { checkDatabaseConnection, disconnectDatabase } from '@cryptoai/database';

import { config } from './config/index.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { assetRoutes } from './routes/assets.js';
import { tokenRoutes } from './routes/tokens.js';
import { investmentRoutes } from './routes/investments.js';
import { tradingRoutes } from './routes/trading.js';
import { kycRoutes } from './routes/kyc.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

// Create Fastify instance
const app = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          }
        : undefined,
  },
});

// Register plugins
async function registerPlugins() {
  // Security
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
  });

  // JWT authentication
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: config.jwtExpiresIn,
    },
  });

  // API documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'CryptoAI.ai API',
        description: 'AI-Powered Tokenization Platform for Equity & Real Estate',
        version: '1.0.0',
      },
      servers: [
        {
          url: config.apiUrl,
          description: config.nodeEnv === 'production' ? 'Production' : 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

// Register middleware
function registerMiddleware() {
  app.addHook('onRequest', requestLogger);
  app.setErrorHandler(errorHandler);
}

// Register routes
async function registerRoutes() {
  // Health check
  app.get('/health', async () => {
    const dbHealthy = await checkDatabaseConnection();
    return {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'up',
        database: dbHealthy ? 'up' : 'down',
      },
    };
  });

  // API version
  app.get('/', async () => ({
    name: 'CryptoAI.ai API',
    version: '1.0.0',
    documentation: '/docs',
  }));

  // Register route modules
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(assetRoutes, { prefix: '/api/v1/assets' });
  await app.register(tokenRoutes, { prefix: '/api/v1/tokens' });
  await app.register(investmentRoutes, { prefix: '/api/v1/investments' });
  await app.register(tradingRoutes, { prefix: '/api/v1/trading' });
  await app.register(kycRoutes, { prefix: '/api/v1/kyc' });
}

// Graceful shutdown
async function gracefulShutdown() {
  app.log.info('Shutting down gracefully...');

  try {
    await app.close();
    await disconnectDatabase();
    app.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    app.log.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  try {
    await registerPlugins();
    registerMiddleware();
    await registerRoutes();

    // Check database connection
    const dbHealthy = await checkDatabaseConnection();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    await app.listen({
      port: config.port,
      host: config.host,
    });

    app.log.info(`🚀 CryptoAI API server running at ${config.apiUrl}`);
    app.log.info(`📚 API documentation available at ${config.apiUrl}/docs`);
  } catch (error) {
    app.log.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
start();

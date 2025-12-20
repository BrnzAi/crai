/**
 * API Configuration
 */

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  apiUrl: process.env.API_URL || 'http://localhost:4000',

  // CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  // Rate limiting
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // External services
  sumsub: {
    appToken: process.env.SUMSUB_APP_TOKEN || '',
    secretKey: process.env.SUMSUB_SECRET_KEY || '',
    baseUrl: process.env.SUMSUB_BASE_URL || 'https://api.sumsub.com',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  circle: {
    apiKey: process.env.CIRCLE_API_KEY || '',
    baseUrl: process.env.CIRCLE_BASE_URL || 'https://api.circle.com/v1',
  },

  // File storage
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'me-south-1',
    bucket: process.env.S3_BUCKET || 'cryptoai-documents',
  },

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // EMPIRE Module - TRDR Database
  empire: {
    trdr: {
      host: process.env.TRDR_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.TRDR_DATABASE_PORT || '5432', 10),
      database: process.env.TRDR_DATABASE_NAME || 'trdr',
      user: process.env.TRDR_DATABASE_USER || 'trdr_user',
      password: process.env.TRDR_DATABASE_PASSWORD || '',
      url: process.env.TRDR_DATABASE_URL || '',
      pool: {
        min: parseInt(process.env.TRDR_DATABASE_POOL_MIN || '2', 10),
        max: parseInt(process.env.TRDR_DATABASE_POOL_MAX || '10', 10),
      },
      ssl: process.env.TRDR_DATABASE_SSL === 'true',
    },
  },
} as const;

// Validate required configuration in production
if (config.nodeEnv === 'production') {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate EMPIRE/TRDR database settings if TRDR is configured
  if (process.env.TRDR_DATABASE_HOST || process.env.TRDR_DATABASE_URL) {
    const trdrRequired = [
      'TRDR_DATABASE_HOST',
      'TRDR_DATABASE_NAME',
      'TRDR_DATABASE_USER',
      'TRDR_DATABASE_PASSWORD',
    ];
    const trdrMissing = trdrRequired.filter((key) => !process.env[key]);

    if (trdrMissing.length > 0) {
      console.warn(`EMPIRE: Missing TRDR database variables: ${trdrMissing.join(', ')}`);
    }
  }
}

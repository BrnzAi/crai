/**
 * EMPIRE Module Configuration
 * Database settings for TRDR PostgreSQL database
 */

export interface TrdrDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

export interface EmpireConfig {
  nodeEnv: string;
  database: TrdrDatabaseConfig;
  databaseUrl: string;
}

/**
 * Parse SSL configuration from environment
 */
function parseSSLConfig(sslEnv: string | undefined): boolean | { rejectUnauthorized: boolean } {
  if (sslEnv === 'true' || sslEnv === '1') {
    return { rejectUnauthorized: true };
  }
  if (sslEnv === 'require') {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * EMPIRE module configuration with TRDR database settings
 */
export const empireConfig: EmpireConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',

  // TRDR Database configuration
  database: {
    host: process.env.TRDR_DATABASE_HOST || 'localhost',
    port: parseInt(process.env.TRDR_DATABASE_PORT || '5432', 10),
    database: process.env.TRDR_DATABASE_NAME || 'trdr',
    user: process.env.TRDR_DATABASE_USER || 'trdr_user',
    password: process.env.TRDR_DATABASE_PASSWORD || '',
    ssl: parseSSLConfig(process.env.TRDR_DATABASE_SSL),
    pool: {
      min: parseInt(process.env.TRDR_DATABASE_POOL_MIN || '2', 10),
      max: parseInt(process.env.TRDR_DATABASE_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
  },

  // Full database URL (alternative to individual settings)
  databaseUrl: process.env.TRDR_DATABASE_URL ||
    `postgresql://${process.env.TRDR_DATABASE_USER || 'trdr_user'}:${process.env.TRDR_DATABASE_PASSWORD || ''}@${process.env.TRDR_DATABASE_HOST || 'localhost'}:${process.env.TRDR_DATABASE_PORT || '5432'}/${process.env.TRDR_DATABASE_NAME || 'trdr'}`,
} as const;

/**
 * Validate required TRDR database configuration in production
 */
export function validateEmpireConfig(): void {
  if (empireConfig.nodeEnv === 'production') {
    const required = [
      'TRDR_DATABASE_HOST',
      'TRDR_DATABASE_NAME',
      'TRDR_DATABASE_USER',
      'TRDR_DATABASE_PASSWORD',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `EMPIRE: Missing required TRDR database environment variables: ${missing.join(', ')}`
      );
    }
  }
}

export default empireConfig;

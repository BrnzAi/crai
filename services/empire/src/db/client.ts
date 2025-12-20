/**
 * TRDR Database Client
 * PostgreSQL connection pool for EMPIRE module
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { empireConfig, validateEmpireConfig } from '../config';

// Validate configuration on module load
validateEmpireConfig();

/**
 * TRDR Database connection pool singleton
 */
let trdrPool: Pool | null = null;

/**
 * Get or create the TRDR database connection pool
 */
export function getTrdrPool(): Pool {
  if (!trdrPool) {
    trdrPool = new Pool({
      host: empireConfig.database.host,
      port: empireConfig.database.port,
      database: empireConfig.database.database,
      user: empireConfig.database.user,
      password: empireConfig.database.password,
      ssl: empireConfig.database.ssl,
      min: empireConfig.database.pool.min,
      max: empireConfig.database.pool.max,
      idleTimeoutMillis: empireConfig.database.pool.idleTimeoutMillis,
      connectionTimeoutMillis: empireConfig.database.pool.connectionTimeoutMillis,
    });

    // Handle pool errors
    trdrPool.on('error', (err) => {
      console.error('[EMPIRE] TRDR database pool error:', err.message);
    });

    // Log pool connection in development
    if (empireConfig.nodeEnv === 'development') {
      console.log('[EMPIRE] TRDR database pool initialized:', {
        host: empireConfig.database.host,
        port: empireConfig.database.port,
        database: empireConfig.database.database,
        user: empireConfig.database.user,
        poolMin: empireConfig.database.pool.min,
        poolMax: empireConfig.database.pool.max,
      });
    }
  }

  return trdrPool;
}

/**
 * Execute a query on the TRDR database
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getTrdrPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);

    if (empireConfig.nodeEnv === 'development') {
      const duration = Date.now() - start;
      console.log('[EMPIRE] TRDR query executed:', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    console.error('[EMPIRE] TRDR query error:', {
      text: text.substring(0, 100),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getTrdrPool();
  return pool.connect();
}

/**
 * Execute a transaction on the TRDR database
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check TRDR database health
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const pool = getTrdrPool();
    const result = await pool.query('SELECT 1 as health_check');

    if (result.rows[0]?.health_check === 1) {
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    }

    return {
      status: 'unhealthy',
      error: 'Unexpected health check result',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} {
  const pool = getTrdrPool();
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Gracefully close the TRDR database connection pool
 */
export async function disconnect(): Promise<void> {
  if (trdrPool) {
    await trdrPool.end();
    trdrPool = null;
    console.log('[EMPIRE] TRDR database pool closed');
  }
}

export default {
  query,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  disconnect,
  getTrdrPool,
};

/**
 * TRDR Database Exports
 * EMPIRE module database utilities
 */

export {
  getTrdrPool,
  query,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  disconnect,
} from './client';

export { default as trdrDb } from './client';

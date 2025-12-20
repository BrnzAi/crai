/**
 * EMPIRE Module
 * Trading module with TRDR database integration
 */

export { empireConfig, validateEmpireConfig } from './config';
export type { EmpireConfig, TrdrDatabaseConfig } from './config';

export {
  trdrDb,
  query,
  getClient,
  transaction,
  healthCheck,
  getPoolStats,
  disconnect,
  getTrdrPool,
} from './db';

// Module initialization
console.log('[EMPIRE] Module loaded');

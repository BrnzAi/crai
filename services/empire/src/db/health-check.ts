/**
 * TRDR Database Health Check Script
 * Run with: npm run db:health
 */

import { healthCheck, getPoolStats, disconnect } from './client';

async function main() {
  console.log('[EMPIRE] Running TRDR database health check...\n');

  try {
    const health = await healthCheck();

    console.log('Health Status:', health.status);
    if (health.latency !== undefined) {
      console.log('Latency:', `${health.latency}ms`);
    }
    if (health.error) {
      console.log('Error:', health.error);
    }

    const stats = getPoolStats();
    console.log('\nPool Statistics:');
    console.log('  Total connections:', stats.totalCount);
    console.log('  Idle connections:', stats.idleCount);
    console.log('  Waiting requests:', stats.waitingCount);

    await disconnect();

    process.exit(health.status === 'healthy' ? 0 : 1);
  } catch (error) {
    console.error('Health check failed:', error);
    await disconnect();
    process.exit(1);
  }
}

main();

/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { DatabaseService } from '@megabrain/core';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const database = req.app.locals.database as DatabaseService;
  const startTime = Date.now();

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Check database
  try {
    const dbStart = Date.now();
    const isHealthy = await database.isHealthy();
    checks.database = {
      status: isHealthy ? 'ok' : 'error',
      latency_ms: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check empire tables
  try {
    const tableResult = await database.query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_name LIKE 'empire_%' OR table_name LIKE 'megabrain_%'`
    );
    const tableCount = parseInt(tableResult.rows[0]?.count || '0', 10);
    checks.empire_tables = {
      status: tableCount > 0 ? 'ok' : 'warning',
      latency_ms: 0,
    };
  } catch (error) {
    checks.empire_tables = {
      status: 'error',
      error: 'Could not check tables',
    };
  }

  // Check providers
  const providerManager = req.app.locals.providerManager;
  if (providerManager) {
    const providerStatus = providerManager.getProvidersStatus();
    checks.providers = {
      status: Object.values(providerStatus).some((p: any) => p.available) ? 'ok' : 'warning',
    };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  const status = allOk ? 'healthy' : 'degraded';

  res.status(allOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
    latency_ms: Date.now() - startTime,
  });
});

router.get('/ready', async (req: Request, res: Response) => {
  const database = req.app.locals.database as DatabaseService;

  try {
    const isHealthy = await database.isHealthy();
    if (isHealthy) {
      res.json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not healthy' });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/live', (_req: Request, res: Response) => {
  res.json({ alive: true, timestamp: new Date().toISOString() });
});

export default router;

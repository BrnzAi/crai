/**
 * Empire API Routes
 * Portfolio management, capital tracking, and strategic operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DatabaseService } from '@megabrain/core';
import { createError } from '../middleware/errorHandler';
import { getWeekNumber } from '@megabrain/core';

const router = Router();

// Helper to get database from request
const getDb = (req: Request): DatabaseService => req.app.locals.database;

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================================
// Portfolio Management
// ============================================================================

// Get all startups
router.get('/portfolio', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const startups = await db.listStartups();
  res.json({ success: true, data: startups });
}));

// Get single startup
router.get('/portfolio/:id', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const startup = await db.getStartup(req.params.id);

  if (!startup) {
    throw createError('Startup not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: startup });
}));

// Create startup
router.post('/portfolio', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { id, name, description, status, founder_status, founder_name, funding_source, github_repo, website, tags, metadata } = req.body;

  if (!id || !name) {
    throw createError('ID and name are required', 400, 'VALIDATION_ERROR');
  }

  const startup = await db.createStartup({
    id,
    name,
    description,
    status: status || 'IDEA',
    founder_status: founder_status || 'NONE',
    founder_name,
    funding_source: funding_source || 'SELF',
    github_repo,
    website,
    tags,
    metadata,
  });

  res.status(201).json({ success: true, data: startup });
}));

// Update startup
router.patch('/portfolio/:id', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const startup = await db.updateStartup(req.params.id, req.body);

  if (!startup) {
    throw createError('Startup not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: startup });
}));

// Delete startup
router.delete('/portfolio/:id', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const deleted = await db.deleteStartup(req.params.id);

  if (!deleted) {
    throw createError('Startup not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, message: 'Startup deleted' });
}));

// Get portfolio summary
router.get('/summary', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const summary = await db.getEmpireSummary();
  res.json({ success: true, data: summary });
}));

// ============================================================================
// Financial Tracking
// ============================================================================

// Get startup financials
router.get('/financials/:startupId', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const financials = await db.getFinancials(req.params.startupId);
  res.json({ success: true, data: financials });
}));

// Log monthly metrics
router.post('/financials/:startupId', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { month, ...metrics } = req.body;

  if (!month) {
    throw createError('Month is required (YYYY-MM format)', 400, 'VALIDATION_ERROR');
  }

  const financials = await db.logFinancials({
    startup_id: req.params.startupId,
    month,
    ...metrics,
  });

  res.status(201).json({ success: true, data: financials });
}));

// ============================================================================
// Treasury Management
// ============================================================================

// Get treasury status
router.get('/treasury/status', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const status = await db.getTreasuryStatus();

  if (!status) {
    res.json({
      success: true,
      data: {
        total_capital: 0,
        daily_pnl: 0,
        monthly_pnl: 0,
        monthly_pnl_percent: 0,
        win_rate: 0,
        active_positions: 0,
        available_for_deployment: 0,
        reserve_amount: 0,
        deployed_to_startups: 0,
      },
    });
    return;
  }

  res.json({ success: true, data: status });
}));

// Update treasury
router.post('/treasury/update', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { total_capital, daily_pnl, monthly_pnl, win_rate, active_positions, notes } = req.body;

  if (total_capital === undefined) {
    throw createError('total_capital is required', 400, 'VALIDATION_ERROR');
  }

  const treasury = await db.updateTreasury({
    total_capital,
    daily_pnl,
    monthly_pnl,
    win_rate,
    active_positions,
    notes,
  });

  res.json({ success: true, data: treasury });
}));

// Get capital history
router.get('/treasury/history', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const days = parseInt(req.query.days as string, 10) || 30;
  const history = await db.getCapitalHistory(days);
  res.json({ success: true, data: history });
}));

// Get allocations
router.get('/treasury/allocations', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const startupId = req.query.startup_id as string | undefined;
  const allocations = await db.getAllocations(startupId);
  res.json({ success: true, data: allocations });
}));

// Create allocation
router.post('/treasury/allocations', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { startup_id, amount, allocation_type, purpose, approved_by } = req.body;

  if (!startup_id || !amount || !allocation_type) {
    throw createError('startup_id, amount, and allocation_type are required', 400, 'VALIDATION_ERROR');
  }

  const allocation = await db.createAllocation({
    startup_id,
    amount,
    allocation_type,
    purpose,
    approved_by,
  });

  res.status(201).json({ success: true, data: allocation });
}));

// Disburse allocation
router.post('/treasury/allocations/:id/disburse', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const allocation = await db.disburseAllocation(req.params.id);

  if (!allocation) {
    throw createError('Allocation not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: allocation });
}));

// ============================================================================
// Weekly Orders
// ============================================================================

// Get current week orders
router.get('/orders/current', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { week, year } = getWeekNumber(new Date());
  const orders = await db.getWeeklyOrders(week, year);
  res.json({ success: true, data: orders });
}));

// Get order history
router.get('/orders/history', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const limit = parseInt(req.query.limit as string, 10) || 12;
  const history = await db.getOrdersHistory(limit);
  res.json({ success: true, data: history });
}));

// Generate weekly orders
router.post('/orders/generate', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const orchestratorService = req.app.locals.orchestratorService;

  // Get current portfolio and treasury status
  const startups = await db.listStartups();
  const treasury = await db.getTreasuryStatus();
  const summary = await db.getEmpireSummary();

  // Generate orders using AI
  const prompt = `Generate weekly orders for the MEGABRAIN empire.

Treasury Status:
${JSON.stringify(treasury, null, 2)}

Portfolio Summary:
${JSON.stringify(summary, null, 2)}

Startups:
${startups.map(s => `- ${s.id}: ${s.name} (${s.status}, ${s.founder_status})`).join('\n')}

Generate strategic orders for this week including:
1. Capital allocations
2. Status changes
3. Alerts
4. Founder assignments

Return JSON with this structure:
{
  "orders": [{"type": "ORDER_TYPE", "description": "...", "startup_id": "...", "priority": "high"}],
  "allocations": [{"startup_id": "...", "amount": 1000, "purpose": "..."}],
  "alerts": [{"level": "warning", "message": "...", "startup_id": "..."}],
  "founder_status": [{"startup_id": "...", "founder_status": "...", "action_required": "..."}],
  "next_decision_point": "2024-01-20",
  "full_report": "markdown report..."
}`;

  const result = await orchestratorService.processMessage('megabrain', prompt);

  let ordersData: any = {};
  try {
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      ordersData = JSON.parse(jsonMatch[0]);
    }
  } catch {
    ordersData = {
      orders: [],
      allocations: [],
      alerts: [],
      founder_status: [],
      full_report: result.response,
    };
  }

  const { week, year } = getWeekNumber(new Date());

  const orders = await db.saveWeeklyOrders({
    week_number: week,
    year,
    generated_at: new Date(),
    trdr_status_json: treasury || {},
    portfolio_status_json: startups.map(s => ({
      startup_id: s.id,
      name: s.name,
      status: s.status,
      health_score: 75,
      key_metric: 'N/A',
      trend: 'stable' as const,
    })),
    orders_json: ordersData.orders || [],
    capital_allocation_json: ordersData.allocations || [],
    alerts_json: ordersData.alerts || [],
    founder_status_json: ordersData.founder_status || [],
    next_decision_point: ordersData.next_decision_point ? new Date(ordersData.next_decision_point) : undefined,
    executed: false,
    full_report: ordersData.full_report,
  });

  res.status(201).json({ success: true, data: orders });
}));

// Execute order
router.post('/orders/:id/execute', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { execution_notes } = req.body;

  const orders = await db.executeWeeklyOrders(req.params.id, execution_notes);

  if (!orders) {
    throw createError('Orders not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: orders });
}));

// ============================================================================
// Pipeline Management
// ============================================================================

// Get idea pipeline
router.get('/pipeline', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const ideas = await db.getPipelineIdeas();
  res.json({ success: true, data: ideas });
}));

// Add new idea
router.post('/pipeline', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const idea = await db.createPipelineIdea(req.body);
  res.status(201).json({ success: true, data: idea });
}));

// Approve idea (convert to startup)
router.post('/pipeline/:id/approve', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const { startup_id } = req.body;

  if (!startup_id) {
    throw createError('startup_id is required', 400, 'VALIDATION_ERROR');
  }

  const idea = await db.approvePipelineIdea(req.params.id, startup_id);

  if (!idea) {
    throw createError('Idea not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: idea });
}));

// ============================================================================
// Decision Tracking
// ============================================================================

// Get decisions
router.get('/decisions', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const decisions = await db.getDecisions(limit);
  res.json({ success: true, data: decisions });
}));

// Log decision
router.post('/decisions', asyncHandler(async (req, res) => {
  const db = getDb(req);
  const decision = await db.logDecision(req.body);
  res.status(201).json({ success: true, data: decision });
}));

export default router;

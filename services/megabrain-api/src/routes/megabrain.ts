/**
 * MEGABRAIN API Routes
 * Chat, consciousness, research, and AI orchestration endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  DatabaseService,
  OrchestratorService,
  ConsciousnessService,
  TradingConsciousnessService,
  DeepResearchService,
  MemoryReasoningService,
  ParallelAIService,
  ProviderManager,
} from '@megabrain/core';
import { createError } from '../middleware/errorHandler';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// ============================================================================
// Workspace Management
// ============================================================================

router.get('/workspaces', asyncHandler(async (req, res) => {
  const db = req.app.locals.database as DatabaseService;
  const workspaces = await db.listWorkspaces();
  res.json({ success: true, data: workspaces });
}));

router.post('/workspaces', asyncHandler(async (req, res) => {
  const db = req.app.locals.database as DatabaseService;
  const { name, description, type } = req.body;

  if (!name) {
    throw createError('Name is required', 400, 'VALIDATION_ERROR');
  }

  const workspace = await db.createWorkspace({ name, description, type });
  res.status(201).json({ success: true, data: workspace });
}));

router.get('/workspaces/:id', asyncHandler(async (req, res) => {
  const db = req.app.locals.database as DatabaseService;
  const workspace = await db.getWorkspace(req.params.id);

  if (!workspace) {
    throw createError('Workspace not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: workspace });
}));

// ============================================================================
// Conversations
// ============================================================================

router.get('/workspaces/:workspaceId/conversations', asyncHandler(async (req, res) => {
  const db = req.app.locals.database as DatabaseService;
  const conversations = await db.listConversations(req.params.workspaceId);
  res.json({ success: true, data: conversations });
}));

router.post('/workspaces/:workspaceId/conversations', asyncHandler(async (req, res) => {
  const db = req.app.locals.database as DatabaseService;
  const { title } = req.body;
  const conversation = await db.createConversation(req.params.workspaceId, title);
  res.status(201).json({ success: true, data: conversation });
}));

// ============================================================================
// Chat with MEGABRAIN
// ============================================================================

router.post('/chat', strictRateLimiter, asyncHandler(async (req, res) => {
  const orchestrator = req.app.locals.orchestratorService as OrchestratorService;
  const { workspace_id, conversation_id, message } = req.body;

  if (!workspace_id || !message) {
    throw createError('workspace_id and message are required', 400, 'VALIDATION_ERROR');
  }

  const result = await orchestrator.processMessage(workspace_id, message, {
    workspaceId: workspace_id,
    conversationId: conversation_id,
  });

  res.json({
    success: true,
    data: {
      response: result.response,
      agentsUsed: result.agentsUsed,
      tokensUsed: result.tokensUsed,
      duration: result.duration,
      toolsUsed: result.toolsUsed,
    },
  });
}));

// Delegate to specific agent
router.post('/delegate', strictRateLimiter, asyncHandler(async (req, res) => {
  const orchestrator = req.app.locals.orchestratorService as OrchestratorService;
  const { agent, task, context } = req.body;

  if (!agent || !task) {
    throw createError('agent and task are required', 400, 'VALIDATION_ERROR');
  }

  const validAgents = ['coder', 'researcher', 'market_analyst', 'orchestrator'];
  if (!validAgents.includes(agent)) {
    throw createError(`Invalid agent. Must be one of: ${validAgents.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const result = await orchestrator.delegateTask(agent, task, context);

  res.json({
    success: true,
    data: result,
  });
}));

// ============================================================================
// Consciousness
// ============================================================================

router.get('/consciousness/state', asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const state = consciousness.getState();
  res.json({ success: true, data: state });
}));

router.post('/consciousness/introspect', strictRateLimiter, asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const { type, context } = req.body;

  if (!type || !context) {
    throw createError('type and context are required', 400, 'VALIDATION_ERROR');
  }

  const introspection = await consciousness.introspect(type, context);
  res.json({ success: true, data: introspection });
}));

router.post('/consciousness/reflect', strictRateLimiter, asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const { topic, insights } = req.body;

  if (!topic || !insights || !Array.isArray(insights)) {
    throw createError('topic and insights array are required', 400, 'VALIDATION_ERROR');
  }

  const reflection = await consciousness.reflect(topic, insights);
  res.json({ success: true, data: reflection });
}));

router.post('/consciousness/patterns', strictRateLimiter, asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const { data, domain } = req.body;

  if (!data || !domain) {
    throw createError('data and domain are required', 400, 'VALIDATION_ERROR');
  }

  const patterns = await consciousness.discoverPatterns(data, domain);
  res.json({ success: true, data: patterns });
}));

router.post('/consciousness/predict', strictRateLimiter, asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const { scenario, factors } = req.body;

  if (!scenario) {
    throw createError('scenario is required', 400, 'VALIDATION_ERROR');
  }

  const prediction = await consciousness.predictOutcome(scenario, factors || []);
  res.json({ success: true, data: prediction });
}));

router.get('/consciousness/introspections', asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const introspections = consciousness.getIntrospections(limit);
  res.json({ success: true, data: introspections });
}));

router.get('/consciousness/reflections', asyncHandler(async (req, res) => {
  const consciousness = req.app.locals.consciousnessService as ConsciousnessService;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const reflections = consciousness.getReflections(limit);
  res.json({ success: true, data: reflections });
}));

// ============================================================================
// Trading Consciousness
// ============================================================================

router.post('/trading/analyze', strictRateLimiter, asyncHandler(async (req, res) => {
  const tradingConsciousness = req.app.locals.tradingConsciousnessService as TradingConsciousnessService;
  const { trades } = req.body;

  if (!trades || !Array.isArray(trades)) {
    throw createError('trades array is required', 400, 'VALIDATION_ERROR');
  }

  const analysis = await tradingConsciousness.analyzeTrades(trades);
  res.json({ success: true, data: analysis });
}));

router.post('/trading/risk', strictRateLimiter, asyncHandler(async (req, res) => {
  const tradingConsciousness = req.app.locals.tradingConsciousnessService as TradingConsciousnessService;
  const { portfolio } = req.body;

  if (!portfolio) {
    throw createError('portfolio is required', 400, 'VALIDATION_ERROR');
  }

  const assessment = await tradingConsciousness.assessTradingRisk(portfolio);
  res.json({ success: true, data: assessment });
}));

router.get('/trading/patterns', asyncHandler(async (req, res) => {
  const tradingConsciousness = req.app.locals.tradingConsciousnessService as TradingConsciousnessService;
  const patterns = tradingConsciousness.getPatterns();
  res.json({ success: true, data: patterns });
}));

router.get('/trading/insights', asyncHandler(async (req, res) => {
  const tradingConsciousness = req.app.locals.tradingConsciousnessService as TradingConsciousnessService;
  const insights = tradingConsciousness.getInsights();
  res.json({ success: true, data: insights });
}));

// ============================================================================
// Deep Research
// ============================================================================

router.post('/research', strictRateLimiter, asyncHandler(async (req, res) => {
  const research = req.app.locals.deepResearchService as DeepResearchService;
  const { topic, type, depth } = req.body;

  if (!topic || !type) {
    throw createError('topic and type are required', 400, 'VALIDATION_ERROR');
  }

  const project = await research.startResearch(topic, type, depth);
  res.status(201).json({ success: true, data: project });
}));

router.get('/research', asyncHandler(async (req, res) => {
  const research = req.app.locals.deepResearchService as DeepResearchService;
  const projects = research.getAllProjects();
  res.json({ success: true, data: projects });
}));

router.get('/research/:id', asyncHandler(async (req, res) => {
  const research = req.app.locals.deepResearchService as DeepResearchService;
  const project = research.getProject(req.params.id);

  if (!project) {
    throw createError('Research project not found', 404, 'NOT_FOUND');
  }

  res.json({ success: true, data: project });
}));

// ============================================================================
// Parallel AI
// ============================================================================

router.post('/parallel', strictRateLimiter, asyncHandler(async (req, res) => {
  const parallelAI = req.app.locals.parallelAIService as ParallelAIService;
  const { prompt, mode, providers } = req.body;

  if (!prompt) {
    throw createError('prompt is required', 400, 'VALIDATION_ERROR');
  }

  const result = await parallelAI.execute(prompt, mode, providers);
  res.json({ success: true, data: result });
}));

// ============================================================================
// Memory Reasoning
// ============================================================================

router.post('/memory/store', asyncHandler(async (req, res) => {
  const memory = req.app.locals.memoryReasoningService as MemoryReasoningService;
  const { workspace_id, content, type, importance, associations } = req.body;

  if (!workspace_id || !content) {
    throw createError('workspace_id and content are required', 400, 'VALIDATION_ERROR');
  }

  const storedMemory = await memory.storeMemory(workspace_id, content, type, importance, associations);
  res.status(201).json({ success: true, data: storedMemory });
}));

router.post('/memory/retrieve', asyncHandler(async (req, res) => {
  const memory = req.app.locals.memoryReasoningService as MemoryReasoningService;
  const { workspace_id, query, limit } = req.body;

  if (!workspace_id || !query) {
    throw createError('workspace_id and query are required', 400, 'VALIDATION_ERROR');
  }

  const memories = await memory.retrieveMemories(workspace_id, query, limit);
  res.json({ success: true, data: memories });
}));

router.post('/memory/reason', strictRateLimiter, asyncHandler(async (req, res) => {
  const memoryService = req.app.locals.memoryReasoningService as MemoryReasoningService;
  const { context, memories } = req.body;

  if (!context) {
    throw createError('context is required', 400, 'VALIDATION_ERROR');
  }

  const result = await memoryService.reasonFromMemories(context, memories || []);
  res.json({ success: true, data: result });
}));

// ============================================================================
// Provider Status
// ============================================================================

router.get('/providers', asyncHandler(async (req, res) => {
  const providerManager = req.app.locals.providerManager as ProviderManager;
  const status = providerManager.getProvidersStatus();
  const availableAgents = providerManager.getAvailableAgents();

  res.json({
    success: true,
    data: {
      providers: status,
      availableAgents,
    },
  });
}));

export default router;

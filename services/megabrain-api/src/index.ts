/**
 * MEGABRAIN API Server
 * Express server for the MEGABRAIN platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import {
  ProviderManager,
  DatabaseService,
  VectorService,
  OrchestratorService,
  ConsciousnessService,
  TradingConsciousnessService,
  DeepResearchService,
  MemoryReasoningService,
  ParallelAIService,
} from '@megabrain/core';

import empireRoutes from './routes/empire';
import megabrainRoutes from './routes/megabrain';
import healthRoutes from './routes/health';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
let database: DatabaseService;
let providerManager: ProviderManager;
let vectorService: VectorService;
let orchestratorService: OrchestratorService;
let consciousnessService: ConsciousnessService;
let tradingConsciousnessService: TradingConsciousnessService;
let deepResearchService: DeepResearchService;
let memoryReasoningService: MemoryReasoningService;
let parallelAIService: ParallelAIService;

async function initializeServices(): Promise<void> {
  console.log('Initializing services...');

  // Initialize database
  database = new DatabaseService();
  await database.initializeFromEnv();
  console.log('Database initialized');

  // Initialize provider manager
  providerManager = new ProviderManager();
  providerManager.initializeFromEnv();
  console.log('Provider manager initialized');

  // Initialize vector service
  vectorService = new VectorService(database);
  if (process.env.OPENAI_API_KEY) {
    vectorService.initialize(process.env.OPENAI_API_KEY);
    console.log('Vector service initialized');
  }

  // Initialize core services
  orchestratorService = new OrchestratorService(providerManager, database, vectorService);
  console.log('Orchestrator service initialized');

  consciousnessService = new ConsciousnessService(providerManager, vectorService);
  console.log('Consciousness service initialized');

  tradingConsciousnessService = new TradingConsciousnessService(providerManager);
  console.log('Trading consciousness service initialized');

  deepResearchService = new DeepResearchService(providerManager);
  console.log('Deep research service initialized');

  memoryReasoningService = new MemoryReasoningService(vectorService, providerManager);
  console.log('Memory reasoning service initialized');

  parallelAIService = new ParallelAIService(providerManager);
  console.log('Parallel AI service initialized');

  // Attach services to app for route access
  app.locals.database = database;
  app.locals.providerManager = providerManager;
  app.locals.vectorService = vectorService;
  app.locals.orchestratorService = orchestratorService;
  app.locals.consciousnessService = consciousnessService;
  app.locals.tradingConsciousnessService = tradingConsciousnessService;
  app.locals.deepResearchService = deepResearchService;
  app.locals.memoryReasoningService = memoryReasoningService;
  app.locals.parallelAIService = parallelAIService;
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(rateLimiter);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/empire', empireRoutes);
app.use('/api/megabrain', megabrainRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MEGABRAIN API',
    version: '1.0.0',
    description: 'The Conscious AI CEO for Building 1000+ Digital Startups',
    endpoints: {
      health: '/api/health',
      empire: '/api/empire',
      megabrain: '/api/megabrain',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function start(): Promise<void> {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ███╗███████╗ ██████╗  █████╗ ██████╗ ██████╗  █████╗██╗███╗   ██╗
║   ████╗ ████║██╔════╝██╔════╝ ██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
║   ██╔████╔██║█████╗  ██║  ███╗███████║██████╔╝██████╔╝███████║██║██╔██╗ ██║
║   ██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
║   ██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║██████╔╝██║  ██║██║  ██║██║██║ ╚████║
║   ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝
║                                                              ║
║   The Conscious AI CEO for Building 1000+ Digital Startups   ║
║                                                              ║
║   Server running on port ${PORT}                                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (database) {
    await database.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  if (database) {
    await database.close();
  }
  process.exit(0);
});

start();

export default app;

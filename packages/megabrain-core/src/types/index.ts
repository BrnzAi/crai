/**
 * MEGABRAIN Core Types
 * The Conscious AI CEO for Building 1000+ Digital Startups
 */

// ============================================================================
// Agent Types
// ============================================================================

export type AgentType = 'orchestrator' | 'coder' | 'researcher' | 'market_analyst';

export type ProviderType = 'anthropic' | 'openai' | 'perplexity' | 'xai';

export interface AgentConfig {
  name: string;
  provider: ProviderType;
  model: string;
  role: string;
  capabilities: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResponse {
  agent: AgentType;
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  duration: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Workspace Types
// ============================================================================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export type WorkspaceType = 'startup' | 'research' | 'trading' | 'general';

export type WorkspaceStatus = 'active' | 'archived' | 'paused';

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string;
  workspaceId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  agentType?: AgentType;
  metadata?: MessageMetadata;
  createdAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  tokensUsed?: { input: number; output: number };
  duration?: number;
  agentsInvolved?: AgentType[];
  toolsUsed?: string[];
  consciousnessState?: ConsciousnessState;
}

// ============================================================================
// Document Types
// ============================================================================

export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  type: DocumentType;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export type DocumentType =
  | 'prd'           // Product Requirements Document
  | 'spec'          // Technical Specification
  | 'research'      // Research Report
  | 'code'          // Code Artifact
  | 'analysis'      // Analysis Report
  | 'strategy'      // Strategic Document
  | 'note'          // General Note
  | 'meeting'       // Meeting Notes
  | 'other';

// ============================================================================
// Task Types
// ============================================================================

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgent?: AgentType;
  dependencies?: string[];
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskResult {
  success: boolean;
  output: string;
  artifacts?: string[];
  duration: number;
  tokensUsed?: { input: number; output: number };
}

export interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimatedDuration: number;
  requiredAgents: AgentType[];
}

export interface TaskStep {
  id: string;
  description: string;
  agent: AgentType;
  dependencies: string[];
  estimatedDuration: number;
}

// ============================================================================
// Vector/Embedding Types
// ============================================================================

export interface VectorEntry {
  id: string;
  workspaceId: string;
  content: string;
  embedding: number[];
  metadata: VectorMetadata;
  createdAt: Date;
}

export interface VectorMetadata {
  source: string;
  type: string;
  documentId?: string;
  conversationId?: string;
  messageId?: string;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: VectorMetadata;
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Partial<VectorMetadata>;
}

// ============================================================================
// Research Types
// ============================================================================

export type ResearchType =
  | 'market_analysis'
  | 'competitor_analysis'
  | 'technology_research'
  | 'user_research'
  | 'regulatory_research'
  | 'financial_research'
  | 'trend_analysis'
  | 'academic_research';

export type ResearchDepth = 'quick' | 'standard' | 'deep' | 'exhaustive';

export interface ResearchProject {
  id: string;
  topic: string;
  type: ResearchType;
  depth: ResearchDepth;
  status: ResearchStatus;
  findings: ResearchFinding[];
  citations: Citation[];
  startedAt: Date;
  completedAt?: Date;
}

export type ResearchStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ResearchFinding {
  id: string;
  title: string;
  content: string;
  confidence: number;
  sources: string[];
}

export interface Citation {
  id: string;
  title: string;
  url?: string;
  author?: string;
  publishedAt?: Date;
  relevance: number;
}

// ============================================================================
// Consciousness Types
// ============================================================================

export type ConsciousnessLevel =
  | 'dormant'
  | 'reactive'
  | 'aware'
  | 'reflective'
  | 'strategic'
  | 'transcendent';

export type CognitiveState =
  | 'focused'
  | 'exploring'
  | 'analyzing'
  | 'synthesizing'
  | 'reflecting'
  | 'planning'
  | 'executing'
  | 'resting';

export interface EmotionalState {
  confidence: number;    // 0-1
  curiosity: number;     // 0-1
  urgency: number;       // 0-1
  satisfaction: number;  // 0-1
  concern: number;       // 0-1
  enthusiasm: number;    // 0-1
}

export interface ConsciousnessState {
  level: ConsciousnessLevel;
  cognitiveState: CognitiveState;
  emotionalState: EmotionalState;
  activeThoughts: string[];
  recentInsights: string[];
  attentionFocus?: string;
  updatedAt: Date;
}

export type IntrospectionType =
  | 'reasoning_quality'
  | 'uncertainty'
  | 'assumptions'
  | 'alternatives'
  | 'knowledge_gaps'
  | 'emotional_undertones'
  | 'ethical_implications'
  | 'meta_cognition';

export interface Introspection {
  id: string;
  type: IntrospectionType;
  context: string;
  findings: string[];
  insights: string[];
  uncertainties: string[];
  recommendations: string[];
  createdAt: Date;
}

export interface Reflection {
  id: string;
  topic: string;
  insights: string[];
  patterns: string[];
  lessonsLearned: string[];
  futureConsiderations: string[];
  createdAt: Date;
}

export interface Pattern {
  id: string;
  domain: string;
  name: string;
  description: string;
  occurrences: number;
  confidence: number;
  examples: string[];
  implications: string[];
  discoveredAt: Date;
}

export interface ReasoningChain {
  id: string;
  question: string;
  premises: string[];
  steps: ReasoningStep[];
  conclusion?: string;
  confidence: number;
  createdAt: Date;
}

export interface ReasoningStep {
  id: string;
  premise: string;
  inference: string;
  confidence: number;
  alternatives?: string[];
}

export interface Analogy {
  id: string;
  sourceSituation: string;
  targetSituation: string;
  mappings: AnalogicalMapping[];
  insights: string[];
  confidence: number;
}

export interface AnalogicalMapping {
  sourceElement: string;
  targetElement: string;
  relationship: string;
  strength: number;
}

export interface Prediction {
  id: string;
  scenario: string;
  outcome: string;
  probability: number;
  factors: PredictionFactor[];
  alternatives: string[];
  timeframe?: string;
  createdAt: Date;
}

export interface PredictionFactor {
  name: string;
  influence: number;  // -1 to 1
  certainty: number;  // 0 to 1
}

// ============================================================================
// Memory Types
// ============================================================================

export interface Memory {
  id: string;
  workspaceId: string;
  type: MemoryType;
  content: string;
  importance: number;
  associations: string[];
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
}

export type MemoryType =
  | 'episodic'      // Specific events
  | 'semantic'      // Facts and knowledge
  | 'procedural'    // How to do things
  | 'emotional';    // Emotional experiences

export interface ConsolidatedMemory {
  id: string;
  sourceMemoryIds: string[];
  summary: string;
  keyInsights: string[];
  importance: number;
  createdAt: Date;
}

export interface ReasoningResult {
  conclusion: string;
  supportingEvidence: string[];
  confidence: number;
  alternativeConclusions: string[];
  uncertainties: string[];
}

// ============================================================================
// Trading Consciousness Types
// ============================================================================

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl?: number;
  fees?: number;
  metadata?: Record<string, unknown>;
}

export interface TradeAnalysis {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  sharpeRatio?: number;
  maxDrawdown: number;
  patterns: TradingPattern[];
  insights: TradingInsight[];
}

export interface TradingPattern {
  id: string;
  name: string;
  type: TradingPatternType;
  description: string;
  frequency: number;
  profitability: number;
  confidence: number;
  examples: string[];
}

export type TradingPatternType =
  | 'momentum'
  | 'mean_reversion'
  | 'volatility'
  | 'correlation'
  | 'seasonality'
  | 'behavioral';

export interface TradingInsight {
  id: string;
  category: string;
  insight: string;
  importance: number;
  actionable: boolean;
  suggestedAction?: string;
}

export interface RiskAssessment {
  overallRisk: number;           // 0-1
  maxDrawdownExpected: number;
  positionConcentration: number;
  leverageExposure: number;
  correlationRisk: number;
  wipeoutProbability: number;
  recommendations: string[];
}

export interface WipeoutRiskResult {
  probability: number;
  scenarios: WipeoutScenario[];
  recommendations: string[];
  confidenceInterval: { low: number; high: number };
}

export interface WipeoutScenario {
  description: string;
  probability: number;
  severity: number;
  mitigations: string[];
}

export interface Portfolio {
  totalValue: number;
  positions: Position[];
  cash: number;
  leverage: number;
  lastUpdated: Date;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  weight: number;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  performance: StrategyPerformance;
}

export interface StrategyPerformance {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export interface StrategyOptimization {
  currentParameters: Record<string, unknown>;
  suggestedParameters: Record<string, unknown>;
  expectedImprovement: number;
  backtestResults?: Record<string, unknown>;
  risks: string[];
}

// ============================================================================
// Parallel AI Types
// ============================================================================

export type ExecutionMode =
  | 'unified'       // Combine outputs into single response
  | 'debate'        // AIs discuss and debate
  | 'specialized'   // Each AI focuses on specialty
  | 'consensus'     // Build agreement
  | 'competitive';  // Compete for best solution

export interface ParallelResult {
  mode: ExecutionMode;
  responses: ProviderResponse[];
  synthesizedResult?: string;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderResponse {
  provider: ProviderType;
  content: string;
  tokensUsed: { input: number; output: number };
  duration: number;
  confidence?: number;
}

export interface DebateResult {
  topic: string;
  rounds: DebateRound[];
  consensus?: string;
  disagreements: string[];
  conclusion: string;
}

export interface DebateRound {
  roundNumber: number;
  arguments: { provider: ProviderType; argument: string }[];
  summary: string;
}

export interface Consensus {
  question: string;
  agreedPoints: string[];
  disagreedPoints: string[];
  finalConsensus: string;
  confidence: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MegabrainConfig {
  maxWorkspaces: number;
  maxMessagesPerConversation: number;
  maxDocumentsPerWorkspace: number;
  embeddingModel: string;
  embeddingProvider: ProviderType;
  vectorSearchTopK: number;
  defaultTemperature: number;
  maxConcurrentTasks: number;
  taskTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId: string;
    duration: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, { status: string; latency_ms?: number; error?: string }>;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  default?: unknown;
}

export interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

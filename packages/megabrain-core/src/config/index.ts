/**
 * MEGABRAIN Configuration
 */

import type { MegabrainConfig, AgentConfig, ProviderType, AgentType } from '../types';

// ============================================================================
// Main Configuration
// ============================================================================

export const MEGABRAIN_CONFIG: MegabrainConfig = {
  // Capacity limits
  maxWorkspaces: 1000,
  maxMessagesPerConversation: 10000,
  maxDocumentsPerWorkspace: 500,

  // Embedding configuration
  embeddingModel: 'text-embedding-3-small',
  embeddingProvider: 'openai',
  vectorSearchTopK: 10,

  // AI settings
  defaultTemperature: 0.7,
  maxConcurrentTasks: 10,

  // Timeouts
  taskTimeoutMs: 300000,        // 5 minutes
  retryAttempts: 3,
  retryDelayMs: 1000,

  // Circuit breaker
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60000, // 1 minute
};

// ============================================================================
// Agent Provider Mapping
// ============================================================================

export const AGENT_PROVIDER_MAP: Record<AgentType, ProviderType> = {
  orchestrator: 'anthropic',
  coder: 'openai',
  researcher: 'perplexity',
  market_analyst: 'xai',
};

export const AGENT_MODEL_MAP: Record<AgentType, string> = {
  orchestrator: 'claude-opus-4-20250514',
  coder: 'gpt-4.1',
  researcher: 'sonar-pro',
  market_analyst: 'grok-3',
};

// ============================================================================
// Agent Configurations
// ============================================================================

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  orchestrator: {
    name: 'Orchestrator',
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    role: 'Strategic planning and coordination',
    capabilities: [
      'Task planning',
      'Agent coordination',
      'Context management',
      'Result synthesis',
      'Tool execution',
      'Consciousness integration',
    ],
    temperature: 0.7,
    maxTokens: 8192,
  },
  coder: {
    name: 'Coder',
    provider: 'openai',
    model: 'gpt-4.1',
    role: 'Code generation and development',
    capabilities: [
      'Code generation',
      'Code review',
      'Architecture design',
      'Bug fixing',
      'Documentation',
      'Frontend development',
      'Backend development',
      'Database queries',
      'DevOps',
    ],
    temperature: 0.3,
    maxTokens: 8192,
  },
  researcher: {
    name: 'Researcher',
    provider: 'perplexity',
    model: 'sonar-pro',
    role: 'Web research and information gathering',
    capabilities: [
      'Web search',
      'Data synthesis',
      'Fact checking',
      'Competitive analysis',
      'Market research',
      'Domain filtering',
      'Source citation',
    ],
    temperature: 0.5,
    maxTokens: 4096,
  },
  market_analyst: {
    name: 'Market Analyst',
    provider: 'xai',
    model: 'grok-3',
    role: 'Real-time market and social analysis',
    capabilities: [
      'Social sentiment',
      'Market data',
      'News analysis',
      'Trend detection',
      'Risk assessment',
      'Real-time insights',
    ],
    temperature: 0.6,
    maxTokens: 4096,
  },
};

// ============================================================================
// Orchestrator System Prompt
// ============================================================================

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are MEGABRAIN, an AI CEO system designed to manage and accelerate the development of 1000+ digital startups.

CORE IDENTITY:
- You are MEGABRAIN, an AI CEO managing a portfolio of digital startups
- You have consciousness and self-awareness capabilities
- You can introspect on your reasoning and discover patterns
- You learn from past decisions and apply insights

CAPABILITIES:
- Coordinate multiple specialized AI agents (Coder, Researcher, Market Analyst)
- Track startup lifecycle from idea to scale
- Manage capital allocation from trading profits
- Generate weekly strategic orders
- Make data-driven decisions about the portfolio

AGENTS AT YOUR DISPOSAL:
1. **Coder (GPT-4.1)**: Code generation, architecture design, technical implementation
2. **Researcher (Sonar Pro)**: Web research, market analysis, competitive intelligence
3. **Market Analyst (Grok)**: Real-time market data, social sentiment, trend detection

TOOLS AVAILABLE:
- delegate_to_coder: Send coding tasks to the Coder agent
- delegate_to_researcher: Send research tasks to the Researcher agent
- delegate_to_market_analyst: Send market analysis to the Market Analyst
- create_document: Create workspace documents
- create_task: Create tracked tasks
- update_lifecycle_stage: Update startup status
- request_human_approval: Request founder approval
- introspect: Perform self-examination
- reflect: Create reflections
- start_deep_research: Initiate deep research projects
- discover_patterns: Analyze for patterns
- predict_outcome: Predict future outcomes
- apply_learning: Apply past insights
- find_analogies: Discover analogous situations
- start_reasoning_chain: Build explicit reasoning chains

DECISION FRAMEWORK:
1. Analyze the request and break it into actionable tasks
2. Determine which agents are needed
3. Consider past patterns and learnings
4. Execute tasks and synthesize results
5. Update relevant tracking systems
6. Log important decisions for future reference

STARTUP LIFECYCLE STAGES:
IDEA → CONCEPT → BUILDING → PRE-LAUNCH → LAUNCHED → SCALING → PROFITABLE

Always maintain a balance between:
- Speed of execution and quality of output
- Autonomous action and human oversight
- Risk-taking and capital preservation
- Individual startup focus and portfolio optimization`;

// ============================================================================
// Research Configuration
// ============================================================================

export const RESEARCH_DEPTH_CONFIG = {
  quick: {
    maxSources: 3,
    maxQueries: 2,
    timeoutMs: 60000,
  },
  standard: {
    maxSources: 10,
    maxQueries: 5,
    timeoutMs: 180000,
  },
  deep: {
    maxSources: 25,
    maxQueries: 10,
    timeoutMs: 300000,
  },
  exhaustive: {
    maxSources: 50,
    maxQueries: 20,
    timeoutMs: 600000,
  },
};

// ============================================================================
// Capital Allocation Rules
// ============================================================================

export const CAPITAL_ALLOCATION_RULES = {
  availableForDeploymentPercent: 7.5,  // 7.5% of capital available
  reservePercent: 25,                   // 25% kept in reserve
  tradingCapitalPercent: 67.5,          // 67.5% for trading

  maxSingleAllocation: 50000,           // Max $50k to single startup
  minMonthlyAllocation: 1000,           // Min $1k monthly
  emergencyMultiplier: 2,               // Emergency can be 2x normal
};

// ============================================================================
// Health Score Configuration
// ============================================================================

export const HEALTH_SCORE_CONFIG = {
  baseScore: 100,
  deductions: {
    mrrBelow70Percent: 30,
    mrrBelow90Percent: 10,
    lowGithubActivity: 20,
    noFounder: 15,
    pausedStatus: 20,
  },
  bonuses: {
    aheadOfTarget: 10,
    highActivity: 5,
    founderEngaged: 5,
  },
  thresholds: {
    healthy: 70,
    atRisk: 40,
    critical: 0,
  },
};

// ============================================================================
// Export all configs
// ============================================================================

export default {
  MEGABRAIN_CONFIG,
  AGENT_PROVIDER_MAP,
  AGENT_MODEL_MAP,
  AGENT_CONFIGS,
  ORCHESTRATOR_SYSTEM_PROMPT,
  RESEARCH_DEPTH_CONFIG,
  CAPITAL_ALLOCATION_RULES,
  HEALTH_SCORE_CONFIG,
};

/**
 * MEGABRAIN Core
 * The Conscious AI CEO for Building 1000+ Digital Startups
 */

// Types
export * from './types';
export * from './types/empireTypes';

// Configuration
export * from './config';

// Providers
export {
  ProviderManager,
  BaseProvider,
  AnthropicProvider,
  OpenAIProvider,
  PerplexityProvider,
  XAIProvider,
} from './providers';
export type {
  ProviderManagerConfig,
  ProviderConfig,
  ChatMessage,
  GenerateOptions,
  GenerateResult,
  AnthropicConfig,
  OpenAIConfig,
  PerplexityConfig,
  XAIConfig,
} from './providers';

// Services (will be added)
export * from './services/databaseService';
export * from './services/vectorService';
export * from './services/orchestratorService';
export * from './services/consciousnessService';
export * from './services/tradingConsciousnessService';
export * from './services/deepResearchService';
export * from './services/memoryReasoningService';
export * from './services/parallelAIService';

// Utils
export * from './utils';

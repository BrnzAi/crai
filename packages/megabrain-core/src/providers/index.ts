/**
 * Provider Manager
 * Central management for all AI providers
 */

import { AnthropicProvider, AnthropicConfig } from './anthropicProvider';
import { OpenAIProvider, OpenAIConfig } from './openaiProvider';
import { PerplexityProvider, PerplexityConfig } from './perplexityProvider';
import { XAIProvider, XAIConfig } from './xaiProvider';
import { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult } from './baseProvider';
import type { ProviderType, AgentType } from '../types';
import { AGENT_PROVIDER_MAP, AGENT_MODEL_MAP } from '../config';

export interface ProviderManagerConfig {
  anthropic?: AnthropicConfig;
  openai?: OpenAIConfig;
  perplexity?: PerplexityConfig;
  xai?: XAIConfig;
}

export class ProviderManager {
  private providers: Map<ProviderType, BaseProvider> = new Map();
  private initialized: boolean = false;

  constructor(config?: ProviderManagerConfig) {
    if (config) {
      this.initialize(config);
    }
  }

  /**
   * Initialize all providers with their configurations
   */
  initialize(config: ProviderManagerConfig): void {
    if (config.anthropic) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropic));
    }

    if (config.openai) {
      this.providers.set('openai', new OpenAIProvider(config.openai));
    }

    if (config.perplexity) {
      this.providers.set('perplexity', new PerplexityProvider(config.perplexity));
    }

    if (config.xai) {
      this.providers.set('xai', new XAIProvider(config.xai));
    }

    this.initialized = true;
  }

  /**
   * Initialize providers from environment variables
   */
  initializeFromEnv(): void {
    const config: ProviderManagerConfig = {};

    if (process.env.ANTHROPIC_API_KEY) {
      config.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: AGENT_MODEL_MAP.orchestrator,
      };
    }

    if (process.env.OPENAI_API_KEY) {
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: AGENT_MODEL_MAP.coder,
        embeddingModel: 'text-embedding-3-small',
      };
    }

    if (process.env.PERPLEXITY_API_KEY) {
      config.perplexity = {
        apiKey: process.env.PERPLEXITY_API_KEY,
        model: AGENT_MODEL_MAP.researcher,
      };
    }

    if (process.env.XAI_API_KEY) {
      config.xai = {
        apiKey: process.env.XAI_API_KEY,
        model: AGENT_MODEL_MAP.market_analyst,
      };
    }

    this.initialize(config);
  }

  /**
   * Get a specific provider
   */
  getProvider(type: ProviderType): BaseProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get the provider for a specific agent
   */
  getProviderForAgent(agent: AgentType): BaseProvider | undefined {
    const providerType = AGENT_PROVIDER_MAP[agent];
    return this.getProvider(providerType);
  }

  /**
   * Check if a provider is configured and available
   */
  isProviderAvailable(type: ProviderType): boolean {
    const provider = this.providers.get(type);
    return provider?.isConfigured() ?? false;
  }

  /**
   * Check if an agent's required provider is available
   */
  isAgentAvailable(agent: AgentType): boolean {
    const providerType = AGENT_PROVIDER_MAP[agent];
    return this.isProviderAvailable(providerType);
  }

  /**
   * Get status of all providers
   */
  getProvidersStatus(): Record<ProviderType, { available: boolean; model: string | null }> {
    const types: ProviderType[] = ['anthropic', 'openai', 'perplexity', 'xai'];
    const status: Record<ProviderType, { available: boolean; model: string | null }> = {} as any;

    for (const type of types) {
      const provider = this.providers.get(type);
      status[type] = {
        available: provider?.isConfigured() ?? false,
        model: provider?.getModel() ?? null,
      };
    }

    return status;
  }

  /**
   * Generate a response using a specific provider
   */
  async generate(
    providerType: ProviderType,
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const provider = this.getProvider(providerType);
    if (!provider) {
      throw new Error(`Provider ${providerType} is not configured`);
    }
    return provider.generate(messages, options);
  }

  /**
   * Generate a response using an agent's provider
   */
  async generateWithAgent(
    agent: AgentType,
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    const provider = this.getProviderForAgent(agent);
    if (!provider) {
      throw new Error(`Provider for agent ${agent} is not configured`);
    }
    return provider.generate(messages, options);
  }

  /**
   * Generate embeddings using OpenAI
   */
  async embed(text: string): Promise<number[]> {
    const provider = this.getProvider('openai') as OpenAIProvider;
    if (!provider || !provider.isConfigured()) {
      throw new Error('OpenAI provider is not configured for embeddings');
    }
    const result = await provider.embed(text);
    return result.embedding;
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get list of available agents
   */
  getAvailableAgents(): AgentType[] {
    const agents: AgentType[] = ['orchestrator', 'coder', 'researcher', 'market_analyst'];
    return agents.filter(agent => this.isAgentAvailable(agent));
  }
}

// Export classes and types
export { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult };
export { AnthropicProvider, AnthropicConfig };
export { OpenAIProvider, OpenAIConfig };
export { PerplexityProvider, PerplexityConfig };
export { XAIProvider, XAIConfig };

// Default export
export default ProviderManager;

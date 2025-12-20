/**
 * Base Provider Interface
 * Abstract class defining the contract for all AI providers
 */

import type { ProviderType, AgentResponse, Tool, ToolCall, ToolResult } from '../types';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: Tool[];
  systemPrompt?: string;
}

export interface GenerateResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  finishReason: 'stop' | 'max_tokens' | 'tool_use' | 'error';
  toolCalls?: ToolCall[];
  duration: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected providerType: ProviderType;

  constructor(config: ProviderConfig, providerType: ProviderType) {
    this.config = config;
    this.providerType = providerType;
  }

  /**
   * Get the provider type
   */
  getProviderType(): ProviderType {
    return this.providerType;
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Check if the provider is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Generate a response from the AI model
   */
  abstract generate(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<GenerateResult>;

  /**
   * Generate embeddings for text (if supported)
   */
  abstract embed?(text: string): Promise<EmbeddingResult>;

  /**
   * Stream a response from the AI model (if supported)
   */
  abstract stream?(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<GenerateResult>;

  /**
   * Convert tools to provider-specific format
   */
  protected abstract convertTools(tools: Tool[]): unknown;

  /**
   * Parse tool calls from provider response
   */
  protected abstract parseToolCalls(response: unknown): ToolCall[];

  /**
   * Helper to measure duration
   */
  protected measureDuration(startTime: number): number {
    return Date.now() - startTime;
  }

  /**
   * Validate that the provider is configured before making a request
   */
  protected validateConfiguration(): void {
    if (!this.isConfigured()) {
      throw new Error(`Provider ${this.providerType} is not properly configured. Missing API key.`);
    }
  }
}

export default BaseProvider;

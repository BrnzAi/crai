/**
 * Perplexity Provider
 * Integration with Sonar models for the Researcher agent
 */

import { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult } from './baseProvider';
import type { Tool, ToolCall } from '../types';

export interface PerplexityConfig extends ProviderConfig {
  searchDomainFilter?: string[];
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  searchRecencyFilter?: 'month' | 'week' | 'day' | 'hour';
}

interface PerplexityCitation {
  url: string;
  title?: string;
}

export interface PerplexityResult extends GenerateResult {
  citations?: PerplexityCitation[];
  relatedQuestions?: string[];
}

export class PerplexityProvider extends BaseProvider {
  private searchConfig: Partial<PerplexityConfig>;

  constructor(config: PerplexityConfig) {
    super(config, 'perplexity');
    this.searchConfig = {
      searchDomainFilter: config.searchDomainFilter,
      returnImages: config.returnImages ?? false,
      returnRelatedQuestions: config.returnRelatedQuestions ?? true,
      searchRecencyFilter: config.searchRecencyFilter,
    };
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<PerplexityResult> {
    this.validateConfiguration();
    const startTime = Date.now();

    const requestMessages = [];

    // Add system prompt if provided
    if (options?.systemPrompt) {
      requestMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      requestMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: requestMessages,
          max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
          temperature: options?.temperature ?? this.config.temperature ?? 0.5,
          search_domain_filter: this.searchConfig.searchDomainFilter,
          return_images: this.searchConfig.returnImages,
          return_related_questions: this.searchConfig.returnRelatedQuestions,
          search_recency_filter: this.searchConfig.searchRecencyFilter,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const content = choice.message.content || '';

      return {
        content,
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        citations: data.citations?.map((url: string) => ({ url })) || [],
        relatedQuestions: data.related_questions || [],
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`Perplexity API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<PerplexityResult> {
    this.validateConfiguration();
    const startTime = Date.now();

    const requestMessages = [];

    if (options?.systemPrompt) {
      requestMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    for (const msg of messages) {
      requestMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: requestMessages,
          max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
          temperature: options?.temperature ?? this.config.temperature ?? 0.5,
          stream: true,
          search_domain_filter: this.searchConfig.searchDomainFilter,
          return_related_questions: this.searchConfig.returnRelatedQuestions,
          search_recency_filter: this.searchConfig.searchRecencyFilter,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity streaming error: ${response.status} - ${error}`);
      }

      let fullContent = '';
      let citations: PerplexityCitation[] = [];
      let relatedQuestions: string[] = [];

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullContent += delta;
                if (onChunk && delta) {
                  onChunk(delta);
                }

                // Capture citations and related questions from final chunk
                if (parsed.citations) {
                  citations = parsed.citations.map((url: string) => ({ url }));
                }
                if (parsed.related_questions) {
                  relatedQuestions = parsed.related_questions;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }

      return {
        content: fullContent,
        tokensUsed: { input: 0, output: 0 },
        finishReason: 'stop',
        citations,
        relatedQuestions,
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`Perplexity streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform a focused research query with domain filtering
   */
  async research(
    query: string,
    options?: {
      domains?: string[];
      recency?: 'month' | 'week' | 'day' | 'hour';
      systemPrompt?: string;
    }
  ): Promise<PerplexityResult> {
    const savedDomainFilter = this.searchConfig.searchDomainFilter;
    const savedRecencyFilter = this.searchConfig.searchRecencyFilter;

    try {
      if (options?.domains) {
        this.searchConfig.searchDomainFilter = options.domains;
      }
      if (options?.recency) {
        this.searchConfig.searchRecencyFilter = options.recency;
      }

      return await this.generate(
        [{ role: 'user', content: query }],
        { systemPrompt: options?.systemPrompt }
      );
    } finally {
      this.searchConfig.searchDomainFilter = savedDomainFilter;
      this.searchConfig.searchRecencyFilter = savedRecencyFilter;
    }
  }

  protected convertTools(_tools: Tool[]): unknown {
    // Perplexity doesn't support tools in the same way
    return [];
  }

  protected parseToolCalls(_response: unknown): ToolCall[] {
    // Perplexity doesn't support tool calls
    return [];
  }

  private mapFinishReason(reason: string | null): GenerateResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'max_tokens';
      default:
        return 'stop';
    }
  }
}

export default PerplexityProvider;

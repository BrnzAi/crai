/**
 * xAI Provider
 * Integration with Grok models for the Market Analyst agent
 */

import { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult } from './baseProvider';
import type { Tool, ToolCall } from '../types';

export interface XAIConfig extends ProviderConfig {
  baseUrl?: string;
}

export class XAIProvider extends BaseProvider {
  private baseUrl: string;

  constructor(config: XAIConfig) {
    super(config, 'xai');
    this.baseUrl = config.baseUrl || 'https://api.x.ai/v1';
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  async generate(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<GenerateResult> {
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: requestMessages,
          max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
          temperature: options?.temperature ?? this.config.temperature ?? 0.6,
          tools: options?.tools ? this.convertTools(options.tools) : undefined,
          stop: options?.stopSequences,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const content = choice.message.content || '';
      const toolCalls = this.parseToolCalls(choice);

      return {
        content,
        tokensUsed: {
          input: data.usage?.prompt_tokens || 0,
          output: data.usage?.completion_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`xAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<GenerateResult> {
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: requestMessages,
          max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
          temperature: options?.temperature ?? this.config.temperature ?? 0.6,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI streaming error: ${response.status} - ${error}`);
      }

      let fullContent = '';

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
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`xAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform market analysis with real-time context
   */
  async analyzeMarket(
    query: string,
    context?: {
      symbols?: string[];
      timeframe?: string;
      includeNews?: boolean;
      includeSocial?: boolean;
    }
  ): Promise<GenerateResult> {
    const systemPrompt = `You are a market analyst with access to real-time data and social media trends.
${context?.symbols ? `Focus on symbols: ${context.symbols.join(', ')}` : ''}
${context?.timeframe ? `Timeframe: ${context.timeframe}` : ''}
${context?.includeNews ? 'Include relevant news analysis.' : ''}
${context?.includeSocial ? 'Include social media sentiment analysis.' : ''}

Provide actionable insights with data-driven reasoning.`;

    return this.generate(
      [{ role: 'user', content: query }],
      { systemPrompt }
    );
  }

  /**
   * Analyze social sentiment for a topic or symbol
   */
  async analyzeSentiment(
    topic: string,
    options?: {
      platform?: 'twitter' | 'all';
      timeframe?: 'hour' | 'day' | 'week';
    }
  ): Promise<GenerateResult> {
    const systemPrompt = `Analyze social media sentiment for: ${topic}
Platform focus: ${options?.platform || 'all'}
Timeframe: ${options?.timeframe || 'day'}

Provide:
1. Overall sentiment (bullish/bearish/neutral with confidence %)
2. Key themes and narratives
3. Notable influencer opinions
4. Trend direction
5. Potential catalysts`;

    return this.generate(
      [{ role: 'user', content: `Analyze current sentiment for ${topic}` }],
      { systemPrompt }
    );
  }

  protected convertTools(tools: Tool[]): unknown[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            tool.parameters.map(param => [
              param.name,
              {
                type: param.type,
                description: param.description,
                enum: param.enum,
                default: param.default,
              },
            ])
          ),
          required: tool.parameters
            .filter(p => p.required)
            .map(p => p.name),
        },
      },
    }));
  }

  protected parseToolCalls(choice: { message?: { tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }): ToolCall[] {
    if (!choice.message?.tool_calls) {
      return [];
    }

    return choice.message.tool_calls.map(tc => ({
      id: tc.id,
      tool: tc.function.name,
      parameters: JSON.parse(tc.function.arguments || '{}'),
    }));
  }

  private mapFinishReason(reason: string | null): GenerateResult['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'max_tokens';
      case 'tool_calls':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}

export default XAIProvider;

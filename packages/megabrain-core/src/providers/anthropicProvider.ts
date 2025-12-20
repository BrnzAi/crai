/**
 * Anthropic Provider
 * Integration with Claude models for the Orchestrator agent
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult } from './baseProvider';
import type { Tool, ToolCall } from '../types';

export interface AnthropicConfig extends ProviderConfig {
  apiVersion?: string;
}

export class AnthropicProvider extends BaseProvider {
  private client: Anthropic | null = null;

  constructor(config: AnthropicConfig) {
    super(config, 'anthropic');
    if (config.apiKey) {
      this.client = new Anthropic({ apiKey: config.apiKey });
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !!this.config.apiKey;
  }

  async generate(
    messages: ChatMessage[],
    options?: GenerateOptions
  ): Promise<GenerateResult> {
    this.validateConfiguration();
    const startTime = Date.now();

    // Separate system message from other messages
    const systemMessage = options?.systemPrompt ||
      messages.find(m => m.role === 'system')?.content || '';

    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await this.client!.messages.create({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        system: systemMessage,
        messages: conversationMessages,
        tools: options?.tools ? this.convertTools(options.tools) as Anthropic.Tool[] : undefined,
        stop_sequences: options?.stopSequences,
      });

      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      const toolCalls = this.parseToolCalls(response);

      return {
        content,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
        finishReason: this.mapStopReason(response.stop_reason),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<GenerateResult> {
    this.validateConfiguration();
    const startTime = Date.now();

    const systemMessage = options?.systemPrompt ||
      messages.find(m => m.role === 'system')?.content || '';

    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;

      const stream = this.client!.messages.stream({
        model: this.config.model,
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        system: systemMessage,
        messages: conversationMessages,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullContent += text;
          if (onChunk) {
            onChunk(text);
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      inputTokens = finalMessage.usage.input_tokens;
      outputTokens = finalMessage.usage.output_tokens;

      return {
        content: fullContent,
        tokensUsed: { input: inputTokens, output: outputTokens },
        finishReason: this.mapStopReason(finalMessage.stop_reason),
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`Anthropic streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected convertTools(tools: Tool[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
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
    }));
  }

  protected parseToolCalls(response: Anthropic.Message): ToolCall[] {
    return response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map(block => ({
        id: block.id,
        tool: block.name,
        parameters: block.input as Record<string, unknown>,
      }));
  }

  private mapStopReason(reason: string | null): GenerateResult['finishReason'] {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'max_tokens';
      case 'tool_use':
        return 'tool_use';
      default:
        return 'stop';
    }
  }
}

export default AnthropicProvider;

/**
 * OpenAI Provider
 * Integration with GPT models for the Coder agent and embeddings
 */

import OpenAI from 'openai';
import { BaseProvider, ProviderConfig, ChatMessage, GenerateOptions, GenerateResult, EmbeddingResult } from './baseProvider';
import type { Tool, ToolCall } from '../types';

export interface OpenAIConfig extends ProviderConfig {
  organization?: string;
  embeddingModel?: string;
}

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI | null = null;
  private embeddingModel: string;

  constructor(config: OpenAIConfig) {
    super(config, 'openai');
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
      });
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

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    // Add system prompt if provided
    if (options?.systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      openaiMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    try {
      const response = await this.client!.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        tools: options?.tools ? this.convertTools(options.tools) as OpenAI.ChatCompletionTool[] : undefined,
        stop: options?.stopSequences,
      });

      const choice = response.choices[0];
      const content = choice.message.content || '';
      const toolCalls = this.parseToolCalls(choice);

      return {
        content,
        tokensUsed: {
          input: response.usage?.prompt_tokens || 0,
          output: response.usage?.completion_tokens || 0,
        },
        finishReason: this.mapFinishReason(choice.finish_reason),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stream(
    messages: ChatMessage[],
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<GenerateResult> {
    this.validateConfiguration();
    const startTime = Date.now();

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    for (const msg of messages) {
      openaiMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    try {
      let fullContent = '';

      const stream = await this.client!.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages,
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullContent += delta;
        if (onChunk && delta) {
          onChunk(delta);
        }
      }

      return {
        content: fullContent,
        tokensUsed: {
          input: 0, // Not available in streaming
          output: 0,
        },
        finishReason: 'stop',
        duration: this.measureDuration(startTime),
      };
    } catch (error) {
      throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embed(text: string): Promise<EmbeddingResult> {
    this.validateConfiguration();

    try {
      const response = await this.client!.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      return {
        embedding: response.data[0].embedding,
        tokensUsed: response.usage.total_tokens,
      };
    } catch (error) {
      throw new Error(`OpenAI embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    this.validateConfiguration();

    try {
      const response = await this.client!.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      const tokensPerText = Math.floor(response.usage.total_tokens / texts.length);

      return response.data.map(item => ({
        embedding: item.embedding,
        tokensUsed: tokensPerText,
      }));
    } catch (error) {
      throw new Error(`OpenAI batch embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected convertTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
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

  protected parseToolCalls(choice: OpenAI.ChatCompletion.Choice): ToolCall[] {
    if (!choice.message.tool_calls) {
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

export default OpenAIProvider;

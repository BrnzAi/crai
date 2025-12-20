/**
 * Parallel AI Service
 * Execute multiple AI models simultaneously with different execution modes
 */

import { ProviderManager, ChatMessage, GenerateOptions, GenerateResult } from '../providers';
import { generateId } from '../utils';
import type {
  ProviderType,
  ExecutionMode,
  ParallelResult,
  ProviderResponse,
  DebateResult,
  DebateRound,
  Consensus,
} from '../types';

export interface ParallelAIConfig {
  defaultMode?: ExecutionMode;
  maxRounds?: number;
  consensusThreshold?: number;
}

export class ParallelAIService {
  private providerManager: ProviderManager;
  private config: ParallelAIConfig;

  constructor(providerManager: ProviderManager, config?: ParallelAIConfig) {
    this.providerManager = providerManager;
    this.config = {
      defaultMode: config?.defaultMode || 'unified',
      maxRounds: config?.maxRounds || 3,
      consensusThreshold: config?.consensusThreshold || 0.7,
    };
  }

  /**
   * Execute prompt across multiple providers in parallel
   */
  async execute(
    prompt: string,
    mode?: ExecutionMode,
    providers?: ProviderType[]
  ): Promise<ParallelResult> {
    const executionMode = mode || this.config.defaultMode || 'unified';
    const startTime = Date.now();

    // Get available providers
    const availableProviders = providers || this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('No providers available for parallel execution');
    }

    // Execute based on mode
    switch (executionMode) {
      case 'unified':
        return this.executeUnified(prompt, availableProviders, startTime);
      case 'debate':
        return this.executeDebate(prompt, availableProviders, startTime);
      case 'specialized':
        return this.executeSpecialized(prompt, availableProviders, startTime);
      case 'consensus':
        return this.executeConsensus(prompt, availableProviders, startTime);
      case 'competitive':
        return this.executeCompetitive(prompt, availableProviders, startTime);
      default:
        return this.executeUnified(prompt, availableProviders, startTime);
    }
  }

  /**
   * Execute in unified mode - combine all responses
   */
  private async executeUnified(
    prompt: string,
    providers: ProviderType[],
    startTime: number
  ): Promise<ParallelResult> {
    const responses = await this.executeAll(prompt, providers);
    const synthesizedResult = await this.synthesize(responses.map(r => r.content));

    return {
      mode: 'unified',
      responses,
      synthesizedResult,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Execute in debate mode - AIs discuss and debate
   */
  private async executeDebate(
    prompt: string,
    providers: ProviderType[],
    startTime: number
  ): Promise<ParallelResult> {
    const rounds: DebateRound[] = [];
    const maxRounds = this.config.maxRounds || 3;

    // Initial responses
    let responses = await this.executeAll(prompt, providers);

    for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
      const roundArguments = responses.map(r => ({
        provider: r.provider,
        argument: r.content,
      }));

      rounds.push({
        roundNumber: roundNum,
        arguments: roundArguments,
        summary: this.summarizeRound(roundArguments),
      });

      if (roundNum < maxRounds) {
        // Generate counter-arguments
        const context = this.buildDebateContext(rounds);
        responses = await this.executeDebateRound(prompt, providers, context);
      }
    }

    const debateResult: DebateResult = {
      topic: prompt,
      rounds,
      disagreements: this.findDisagreements(rounds),
      conclusion: await this.synthesize(rounds.map(r => r.summary)),
    };

    return {
      mode: 'debate',
      responses,
      synthesizedResult: debateResult.conclusion,
      executionTime: Date.now() - startTime,
      metadata: { debate: debateResult },
    };
  }

  /**
   * Execute in specialized mode - each AI focuses on specialty
   */
  private async executeSpecialized(
    prompt: string,
    providers: ProviderType[],
    startTime: number
  ): Promise<ParallelResult> {
    const specialtyPrompts = providers.map(provider => {
      const specialty = this.getProviderSpecialty(provider);
      return `${prompt}\n\nFocus on: ${specialty}`;
    });

    const responses: ProviderResponse[] = [];

    for (let i = 0; i < providers.length; i++) {
      const provider = this.providerManager.getProvider(providers[i]);
      if (!provider?.isConfigured()) continue;

      const result = await provider.generate(
        [{ role: 'user', content: specialtyPrompts[i] }],
        { temperature: 0.5 }
      );

      responses.push({
        provider: providers[i],
        content: result.content,
        tokensUsed: result.tokensUsed,
        duration: result.duration,
      });
    }

    const synthesizedResult = await this.synthesize(responses.map(r => r.content));

    return {
      mode: 'specialized',
      responses,
      synthesizedResult,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Execute in consensus mode - build agreement
   */
  private async executeConsensus(
    prompt: string,
    providers: ProviderType[],
    startTime: number
  ): Promise<ParallelResult> {
    const responses = await this.executeAll(prompt, providers);
    const consensus = await this.buildConsensus(prompt, responses);

    return {
      mode: 'consensus',
      responses,
      synthesizedResult: consensus.finalConsensus,
      executionTime: Date.now() - startTime,
      metadata: { consensus },
    };
  }

  /**
   * Execute in competitive mode - pick best solution
   */
  private async executeCompetitive(
    prompt: string,
    providers: ProviderType[],
    startTime: number
  ): Promise<ParallelResult> {
    const responses = await this.executeAll(prompt, providers);
    const winner = await this.selectWinner(prompt, responses);

    return {
      mode: 'competitive',
      responses,
      synthesizedResult: winner.content,
      executionTime: Date.now() - startTime,
      metadata: { winner: winner.provider },
    };
  }

  /**
   * Execute prompt on all providers in parallel
   */
  private async executeAll(
    prompt: string,
    providers: ProviderType[]
  ): Promise<ProviderResponse[]> {
    const promises = providers.map(async (providerType) => {
      const provider = this.providerManager.getProvider(providerType);
      if (!provider?.isConfigured()) {
        return null;
      }

      const startTime = Date.now();
      const result = await provider.generate(
        [{ role: 'user', content: prompt }],
        { temperature: 0.7 }
      );

      return {
        provider: providerType,
        content: result.content,
        tokensUsed: result.tokensUsed,
        duration: Date.now() - startTime,
      };
    });

    const results = await Promise.all(promises);
    return results.filter((r): r is ProviderResponse => r !== null);
  }

  /**
   * Execute a debate round
   */
  private async executeDebateRound(
    prompt: string,
    providers: ProviderType[],
    context: string
  ): Promise<ProviderResponse[]> {
    const debatePrompt = `${prompt}

Previous discussion:
${context}

Provide your counter-argument or agreement, addressing the points raised by others.`;

    return this.executeAll(debatePrompt, providers);
  }

  /**
   * Build debate context from previous rounds
   */
  private buildDebateContext(rounds: DebateRound[]): string {
    return rounds
      .map(r => {
        const args = r.arguments
          .map(a => `**${a.provider}**: ${a.argument.substring(0, 500)}`)
          .join('\n');
        return `### Round ${r.roundNumber}\n${args}`;
      })
      .join('\n\n');
  }

  /**
   * Summarize a debate round
   */
  private summarizeRound(
    arguments_: { provider: ProviderType; argument: string }[]
  ): string {
    return arguments_
      .map(a => `${a.provider}: ${a.argument.substring(0, 200)}...`)
      .join('\n');
  }

  /**
   * Find disagreements in debate
   */
  private findDisagreements(rounds: DebateRound[]): string[] {
    // Simple implementation - in a real system this would be more sophisticated
    const disagreements: string[] = [];
    if (rounds.length > 1) {
      disagreements.push('Different approaches suggested for implementation');
    }
    return disagreements;
  }

  /**
   * Synthesize multiple responses into one
   */
  private async synthesize(responses: string[]): Promise<string> {
    if (responses.length === 0) {
      return '';
    }

    if (responses.length === 1) {
      return responses[0];
    }

    const synthesisPrompt = `Synthesize these different perspectives into a coherent, comprehensive response:

${responses.map((r, i) => `**Response ${i + 1}:**\n${r.substring(0, 1000)}`).join('\n\n')}

Combine the best insights from each while resolving any contradictions.`;

    const result = await this.providerManager.generate(
      'anthropic',
      [{ role: 'user', content: synthesisPrompt }],
      { temperature: 0.5 }
    );

    return result.content;
  }

  /**
   * Build consensus from responses
   */
  async buildConsensus(
    question: string,
    responses: ProviderResponse[]
  ): Promise<Consensus> {
    const consensusPrompt = `Analyze these responses and identify points of agreement and disagreement:

Question: ${question}

${responses.map(r => `**${r.provider}:**\n${r.content.substring(0, 800)}`).join('\n\n')}

Return JSON:
{
  "agreedPoints": ["point that all agree on"],
  "disagreedPoints": ["point of disagreement"],
  "finalConsensus": "synthesized consensus view",
  "confidence": 0.75
}`;

    const result = await this.providerManager.generate(
      'anthropic',
      [{ role: 'user', content: consensusPrompt }],
      { temperature: 0.4 }
    );

    let consensus: Consensus = {
      question,
      agreedPoints: [],
      disagreedPoints: [],
      finalConsensus: result.content,
      confidence: 0.5,
    };

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        consensus = { question, ...parsed };
      }
    } catch {
      // Use default
    }

    return consensus;
  }

  /**
   * Select winner from competitive responses
   */
  private async selectWinner(
    prompt: string,
    responses: ProviderResponse[]
  ): Promise<ProviderResponse> {
    if (responses.length === 1) {
      return responses[0];
    }

    const evaluationPrompt = `Evaluate these responses and select the best one:

Original Question: ${prompt}

${responses.map((r, i) => `**Option ${i + 1} (${r.provider}):**\n${r.content.substring(0, 800)}`).join('\n\n')}

Which response is best? Return the option number (1-${responses.length}).`;

    const result = await this.providerManager.generate(
      'anthropic',
      [{ role: 'user', content: evaluationPrompt }],
      { temperature: 0.3 }
    );

    // Extract the number
    const match = result.content.match(/\d+/);
    const winnerIndex = match ? parseInt(match[0], 10) - 1 : 0;

    return responses[Math.max(0, Math.min(winnerIndex, responses.length - 1))];
  }

  /**
   * Get provider specialty
   */
  private getProviderSpecialty(provider: ProviderType): string {
    const specialties: Record<ProviderType, string> = {
      anthropic: 'strategic analysis, complex reasoning, and ethical considerations',
      openai: 'code implementation, technical details, and practical solutions',
      perplexity: 'research, fact-checking, and current information',
      xai: 'market trends, social sentiment, and real-time analysis',
    };
    return specialties[provider] || 'general analysis';
  }

  /**
   * Get available providers
   */
  private getAvailableProviders(): ProviderType[] {
    const types: ProviderType[] = ['anthropic', 'openai', 'perplexity', 'xai'];
    return types.filter(type => this.providerManager.isProviderAvailable(type));
  }
}

export default ParallelAIService;

/**
 * Memory Reasoning Service
 * Memory management and reasoning from past experiences
 */

import { VectorService } from './vectorService';
import { ProviderManager } from '../providers';
import { generateId } from '../utils';
import type { Memory, MemoryType, ConsolidatedMemory, ReasoningResult } from '../types';

export interface MemoryReasoningConfig {
  maxMemories?: number;
  consolidationThreshold?: number;
  relevanceThreshold?: number;
}

export class MemoryReasoningService {
  private vectorService: VectorService;
  private providerManager: ProviderManager;
  private config: MemoryReasoningConfig;
  private memoryCache: Map<string, Memory[]> = new Map();

  constructor(
    vectorService: VectorService,
    providerManager: ProviderManager,
    config?: MemoryReasoningConfig
  ) {
    this.vectorService = vectorService;
    this.providerManager = providerManager;
    this.config = {
      maxMemories: config?.maxMemories || 1000,
      consolidationThreshold: config?.consolidationThreshold || 10,
      relevanceThreshold: config?.relevanceThreshold || 0.7,
    };
  }

  /**
   * Store a memory
   */
  async storeMemory(
    workspaceId: string,
    content: string,
    type: MemoryType = 'semantic',
    importance: number = 0.5,
    associations: string[] = []
  ): Promise<Memory> {
    const memory: Memory = {
      id: generateId(),
      workspaceId,
      type,
      content,
      importance,
      associations,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
    };

    // Store in vector database for semantic search
    await this.vectorService.store(workspaceId, content, {
      source: 'memory',
      type: type,
      tags: associations,
    });

    // Add to cache
    const cached = this.memoryCache.get(workspaceId) || [];
    cached.push(memory);
    this.memoryCache.set(workspaceId, cached);

    // Check if consolidation is needed
    if (cached.length >= (this.config.consolidationThreshold || 10)) {
      // Trigger consolidation in background
      this.maybeConsolidate(workspaceId);
    }

    return memory;
  }

  /**
   * Retrieve relevant memories
   */
  async retrieveMemories(
    workspaceId: string,
    query: string,
    limit: number = 10
  ): Promise<Memory[]> {
    // Search vector database for relevant memories
    const searchResults = await this.vectorService.search(workspaceId, query, {
      topK: limit,
      threshold: this.config.relevanceThreshold,
      filter: { source: 'memory' },
    });

    // Convert search results to memories
    const memories: Memory[] = searchResults.map(result => ({
      id: result.id,
      workspaceId,
      type: (result.metadata.type as MemoryType) || 'semantic',
      content: result.content,
      importance: result.score,
      associations: (result.metadata.tags as string[]) || [],
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
    }));

    // Update access counts and times (in a real system, this would be persisted)
    for (const memory of memories) {
      memory.lastAccessedAt = new Date();
      memory.accessCount++;
    }

    return memories;
  }

  /**
   * Reason from memories
   */
  async reasonFromMemories(
    currentContext: string,
    memories: Memory[]
  ): Promise<ReasoningResult> {
    if (memories.length === 0) {
      return {
        conclusion: 'No relevant memories found to reason from.',
        supportingEvidence: [],
        confidence: 0.1,
        alternativeConclusions: [],
        uncertainties: ['No historical context available'],
      };
    }

    const memoriesText = memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10)
      .map((m, i) => `${i + 1}. [${m.type}] ${m.content}`)
      .join('\n');

    const prompt = `Based on these memories and the current context, reason about the best course of action:

Current Context:
${currentContext}

Relevant Memories:
${memoriesText}

Analyze the memories and provide reasoning. Return JSON:
{
  "conclusion": "your main conclusion",
  "supportingEvidence": ["evidence from memories"],
  "confidence": 0.75,
  "alternativeConclusions": ["other possible conclusions"],
  "uncertainties": ["things we're uncertain about"]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    let result: ReasoningResult = {
      conclusion: response.content,
      supportingEvidence: [],
      confidence: 0.5,
      alternativeConclusions: [],
      uncertainties: [],
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use default result with response content
    }

    return result;
  }

  /**
   * Consolidate memories
   */
  async consolidateMemories(memories: Memory[]): Promise<ConsolidatedMemory> {
    if (memories.length === 0) {
      throw new Error('No memories to consolidate');
    }

    const memoriesText = memories
      .map((m, i) => `${i + 1}. ${m.content}`)
      .join('\n');

    const prompt = `Consolidate these related memories into a single summary:

Memories:
${memoriesText}

Provide a consolidated summary. Return JSON:
{
  "summary": "consolidated summary",
  "keyInsights": ["key insight 1", "key insight 2"]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 }
    );

    let result = {
      summary: response.content,
      keyInsights: [] as string[],
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use default
    }

    const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / memories.length;

    return {
      id: generateId(),
      sourceMemoryIds: memories.map(m => m.id),
      summary: result.summary,
      keyInsights: result.keyInsights,
      importance: Math.min(1, avgImportance + 0.1),
      createdAt: new Date(),
    };
  }

  /**
   * Maybe consolidate if threshold reached
   */
  private async maybeConsolidate(workspaceId: string): Promise<void> {
    const memories = this.memoryCache.get(workspaceId) || [];
    const threshold = this.config.consolidationThreshold || 10;

    if (memories.length < threshold) {
      return;
    }

    // Group by type
    const byType = new Map<MemoryType, Memory[]>();
    for (const memory of memories) {
      const group = byType.get(memory.type) || [];
      group.push(memory);
      byType.set(memory.type, group);
    }

    // Consolidate each type if over threshold
    for (const [type, typeMemories] of byType) {
      if (typeMemories.length >= threshold) {
        try {
          const consolidated = await this.consolidateMemories(typeMemories);

          // Store consolidated memory
          await this.storeMemory(
            workspaceId,
            consolidated.summary,
            type,
            consolidated.importance,
            consolidated.keyInsights
          );

          // Remove old memories from cache
          const remaining = memories.filter(m => !consolidated.sourceMemoryIds.includes(m.id));
          this.memoryCache.set(workspaceId, remaining);
        } catch {
          // Continue if consolidation fails
        }
      }
    }
  }

  /**
   * Find similar memories
   */
  async findSimilar(
    workspaceId: string,
    content: string,
    limit: number = 5
  ): Promise<Memory[]> {
    return this.retrieveMemories(workspaceId, content, limit);
  }

  /**
   * Get memories by type
   */
  getMemoriesByType(workspaceId: string, type: MemoryType): Memory[] {
    const memories = this.memoryCache.get(workspaceId) || [];
    return memories.filter(m => m.type === type);
  }

  /**
   * Get important memories
   */
  getImportantMemories(workspaceId: string, threshold: number = 0.7): Memory[] {
    const memories = this.memoryCache.get(workspaceId) || [];
    return memories
      .filter(m => m.importance >= threshold)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Get recent memories
   */
  getRecentMemories(workspaceId: string, limit: number = 10): Memory[] {
    const memories = this.memoryCache.get(workspaceId) || [];
    return memories
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get frequently accessed memories
   */
  getFrequentlyAccessedMemories(workspaceId: string, limit: number = 10): Memory[] {
    const memories = this.memoryCache.get(workspaceId) || [];
    return memories
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Clear workspace memories
   */
  clearMemories(workspaceId: string): void {
    this.memoryCache.delete(workspaceId);
  }

  /**
   * Get memory count
   */
  getMemoryCount(workspaceId: string): number {
    const memories = this.memoryCache.get(workspaceId) || [];
    return memories.length;
  }
}

export default MemoryReasoningService;

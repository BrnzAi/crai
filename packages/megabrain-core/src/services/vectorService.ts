/**
 * Vector Service
 * Handles embeddings and semantic search for memory
 */

import { OpenAIProvider } from '../providers/openaiProvider';
import { DatabaseService } from './databaseService';
import { cosineSimilarity, generateId } from '../utils';
import type { VectorEntry, VectorMetadata, SearchResult, SearchOptions } from '../types';
import { MEGABRAIN_CONFIG } from '../config';

export interface VectorServiceConfig {
  embeddingModel?: string;
  topK?: number;
  similarityThreshold?: number;
}

export class VectorService {
  private openaiProvider: OpenAIProvider | null = null;
  private database: DatabaseService;
  private config: VectorServiceConfig;
  private cache: Map<string, VectorEntry[]> = new Map();

  constructor(database: DatabaseService, config?: VectorServiceConfig) {
    this.database = database;
    this.config = {
      embeddingModel: config?.embeddingModel || MEGABRAIN_CONFIG.embeddingModel,
      topK: config?.topK || MEGABRAIN_CONFIG.vectorSearchTopK,
      similarityThreshold: config?.similarityThreshold || 0.7,
    };
  }

  /**
   * Initialize with OpenAI provider for embeddings
   */
  initialize(apiKey: string): void {
    this.openaiProvider = new OpenAIProvider({
      apiKey,
      model: 'gpt-4.1', // Not used for embeddings
      embeddingModel: this.config.embeddingModel,
    });
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.openaiProvider?.isConfigured() ?? false;
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.openaiProvider) {
      throw new Error('Vector service not initialized. Call initialize() first.');
    }

    const result = await this.openaiProvider.embed(text);
    return result.embedding;
  }

  /**
   * Store content with its embedding
   */
  async store(
    workspaceId: string,
    content: string,
    metadata: VectorMetadata
  ): Promise<string> {
    const embedding = await this.embed(content);

    const id = await this.database.storeVector({
      workspaceId,
      content,
      embedding,
      metadata,
    });

    // Invalidate cache for this workspace
    this.cache.delete(workspaceId);

    return id;
  }

  /**
   * Store multiple contents in batch
   */
  async storeBatch(
    workspaceId: string,
    items: Array<{ content: string; metadata: VectorMetadata }>
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const item of items) {
      const id = await this.store(workspaceId, item.content, item.metadata);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Search for similar content
   */
  async search(
    workspaceId: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const topK = options?.topK || this.config.topK || 10;
    const threshold = options?.threshold || this.config.similarityThreshold || 0.7;

    // Get query embedding
    const queryEmbedding = await this.embed(query);

    // Get all vectors for workspace (with caching)
    let vectors = this.cache.get(workspaceId);
    if (!vectors) {
      vectors = await this.database.getVectors(workspaceId);
      this.cache.set(workspaceId, vectors);
    }

    // Calculate similarities and filter
    const results: SearchResult[] = [];

    for (const vector of vectors) {
      // Apply metadata filter if provided
      if (options?.filter) {
        let match = true;
        for (const [key, value] of Object.entries(options.filter)) {
          if (vector.metadata[key as keyof VectorMetadata] !== value) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      // Parse embedding if stored as string
      const embedding = typeof vector.embedding === 'string'
        ? JSON.parse(vector.embedding)
        : vector.embedding;

      const score = cosineSimilarity(queryEmbedding, embedding);

      if (score >= threshold) {
        results.push({
          id: vector.id,
          content: vector.content,
          score,
          metadata: vector.metadata,
        });
      }
    }

    // Sort by score and take top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Find similar documents based on an existing document
   */
  async findSimilar(
    workspaceId: string,
    documentId: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Get the source vector
    const vectors = await this.database.getVectors(workspaceId);
    const sourceVector = vectors.find(v => v.metadata.documentId === documentId);

    if (!sourceVector) {
      throw new Error(`Document ${documentId} not found in vector store`);
    }

    const topK = options?.topK || this.config.topK || 10;
    const threshold = options?.threshold || this.config.similarityThreshold || 0.7;

    // Parse embedding if stored as string
    const sourceEmbedding = typeof sourceVector.embedding === 'string'
      ? JSON.parse(sourceVector.embedding)
      : sourceVector.embedding;

    // Calculate similarities
    const results: SearchResult[] = [];

    for (const vector of vectors) {
      // Skip the source document itself
      if (vector.id === sourceVector.id) continue;

      const embedding = typeof vector.embedding === 'string'
        ? JSON.parse(vector.embedding)
        : vector.embedding;

      const score = cosineSimilarity(sourceEmbedding, embedding);

      if (score >= threshold) {
        results.push({
          id: vector.id,
          content: vector.content,
          score,
          metadata: vector.metadata,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Delete vectors by ID
   */
  async delete(workspaceId: string, ids: string[]): Promise<void> {
    await this.database.deleteVectors(ids);
    this.cache.delete(workspaceId);
  }

  /**
   * Delete all vectors for a workspace
   */
  async deleteAll(workspaceId: string): Promise<void> {
    const vectors = await this.database.getVectors(workspaceId);
    const ids = vectors.map(v => v.id);
    await this.delete(workspaceId, ids);
  }

  /**
   * Get all vectors for a workspace
   */
  async getAll(workspaceId: string): Promise<VectorEntry[]> {
    return this.database.getVectors(workspaceId);
  }

  /**
   * Get vector count for a workspace
   */
  async getCount(workspaceId: string): Promise<number> {
    const vectors = await this.database.getVectors(workspaceId);
    return vectors.length;
  }

  /**
   * Clear the vector cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for a specific workspace
   */
  invalidateCache(workspaceId: string): void {
    this.cache.delete(workspaceId);
  }

  /**
   * Cluster similar vectors together
   */
  async cluster(
    workspaceId: string,
    numClusters: number
  ): Promise<Map<number, VectorEntry[]>> {
    const vectors = await this.database.getVectors(workspaceId);
    if (vectors.length < numClusters) {
      throw new Error('Not enough vectors to form requested number of clusters');
    }

    // Simple k-means clustering
    const clusters = new Map<number, VectorEntry[]>();
    const centroids: number[][] = [];

    // Initialize centroids randomly
    const shuffled = [...vectors].sort(() => Math.random() - 0.5);
    for (let i = 0; i < numClusters; i++) {
      const embedding = typeof shuffled[i].embedding === 'string'
        ? JSON.parse(shuffled[i].embedding)
        : shuffled[i].embedding;
      centroids.push(embedding);
      clusters.set(i, []);
    }

    // Iterate until convergence (max 10 iterations)
    for (let iteration = 0; iteration < 10; iteration++) {
      // Clear clusters
      for (let i = 0; i < numClusters; i++) {
        clusters.set(i, []);
      }

      // Assign vectors to nearest centroid
      for (const vector of vectors) {
        const embedding = typeof vector.embedding === 'string'
          ? JSON.parse(vector.embedding)
          : vector.embedding;

        let bestCluster = 0;
        let bestScore = -Infinity;

        for (let i = 0; i < numClusters; i++) {
          const score = cosineSimilarity(embedding, centroids[i]);
          if (score > bestScore) {
            bestScore = score;
            bestCluster = i;
          }
        }

        clusters.get(bestCluster)!.push(vector);
      }

      // Update centroids
      for (let i = 0; i < numClusters; i++) {
        const clusterVectors = clusters.get(i)!;
        if (clusterVectors.length === 0) continue;

        const dim = centroids[i].length;
        const newCentroid = new Array(dim).fill(0);

        for (const vector of clusterVectors) {
          const embedding = typeof vector.embedding === 'string'
            ? JSON.parse(vector.embedding)
            : vector.embedding;

          for (let j = 0; j < dim; j++) {
            newCentroid[j] += embedding[j] / clusterVectors.length;
          }
        }

        centroids[i] = newCentroid;
      }
    }

    return clusters;
  }
}

export default VectorService;

/**
 * Deep Research Service
 * Comprehensive research capabilities across 8 domains
 */

import { ProviderManager } from '../providers';
import { PerplexityProvider } from '../providers/perplexityProvider';
import { generateId } from '../utils';
import { RESEARCH_DEPTH_CONFIG } from '../config';
import type {
  ResearchType,
  ResearchDepth,
  ResearchProject,
  ResearchStatus,
  ResearchFinding,
  Citation,
} from '../types';

export interface DeepResearchConfig {
  defaultDepth?: ResearchDepth;
  maxConcurrentResearch?: number;
}

export class DeepResearchService {
  private providerManager: ProviderManager;
  private config: DeepResearchConfig;
  private activeProjects: Map<string, ResearchProject> = new Map();

  constructor(providerManager: ProviderManager, config?: DeepResearchConfig) {
    this.providerManager = providerManager;
    this.config = {
      defaultDepth: config?.defaultDepth || 'standard',
      maxConcurrentResearch: config?.maxConcurrentResearch || 3,
    };
  }

  /**
   * Start a research project
   */
  async startResearch(
    topic: string,
    type: ResearchType,
    depth?: ResearchDepth
  ): Promise<ResearchProject> {
    const researchDepth = depth || this.config.defaultDepth || 'standard';
    const depthConfig = RESEARCH_DEPTH_CONFIG[researchDepth];

    const project: ResearchProject = {
      id: generateId(),
      topic,
      type,
      depth: researchDepth,
      status: 'in_progress',
      findings: [],
      citations: [],
      startedAt: new Date(),
    };

    this.activeProjects.set(project.id, project);

    try {
      // Generate research queries based on type
      const queries = await this.generateResearchQueries(topic, type, depthConfig.maxQueries);

      // Execute research queries
      for (const query of queries) {
        const result = await this.executeResearchQuery(query, type);
        project.findings.push(...result.findings);
        project.citations.push(...result.citations);
      }

      // Synthesize findings
      const synthesis = await this.synthesizeFindings(project);
      project.findings.unshift({
        id: generateId(),
        title: 'Executive Summary',
        content: synthesis,
        confidence: 0.9,
        sources: project.citations.map(c => c.url || c.title),
      });

      project.status = 'completed';
      project.completedAt = new Date();
    } catch (error) {
      project.status = 'failed';
      project.findings.push({
        id: generateId(),
        title: 'Error',
        content: error instanceof Error ? error.message : 'Research failed',
        confidence: 0,
        sources: [],
      });
    }

    return project;
  }

  /**
   * Generate research queries based on topic and type
   */
  private async generateResearchQueries(
    topic: string,
    type: ResearchType,
    maxQueries: number
  ): Promise<string[]> {
    const typePrompts: Record<ResearchType, string> = {
      market_analysis: `Generate ${maxQueries} specific research queries for market analysis of: ${topic}
Focus on: market size, growth rate, key players, trends, and barriers to entry.`,

      competitor_analysis: `Generate ${maxQueries} research queries for competitor analysis of: ${topic}
Focus on: direct competitors, indirect competitors, their strengths, weaknesses, and strategies.`,

      technology_research: `Generate ${maxQueries} research queries for technology research on: ${topic}
Focus on: technical capabilities, implementation approaches, best practices, and limitations.`,

      user_research: `Generate ${maxQueries} research queries for user research about: ${topic}
Focus on: user needs, pain points, behaviors, preferences, and demographics.`,

      regulatory_research: `Generate ${maxQueries} research queries for regulatory research on: ${topic}
Focus on: applicable laws, compliance requirements, regulatory bodies, and recent changes.`,

      financial_research: `Generate ${maxQueries} research queries for financial research on: ${topic}
Focus on: revenue models, unit economics, funding patterns, and financial benchmarks.`,

      trend_analysis: `Generate ${maxQueries} research queries for trend analysis of: ${topic}
Focus on: emerging trends, historical patterns, future predictions, and industry shifts.`,

      academic_research: `Generate ${maxQueries} research queries for academic research on: ${topic}
Focus on: peer-reviewed studies, academic papers, research institutions, and key researchers.`,
    };

    const prompt = `${typePrompts[type]}

Return a JSON array of search queries:
["query 1", "query 2", "query 3"]`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall back to default queries
    }

    return [`${type.replace('_', ' ')} ${topic}`];
  }

  /**
   * Execute a research query using Perplexity
   */
  private async executeResearchQuery(
    query: string,
    type: ResearchType
  ): Promise<{ findings: ResearchFinding[]; citations: Citation[] }> {
    const findings: ResearchFinding[] = [];
    const citations: Citation[] = [];

    const provider = this.providerManager.getProvider('perplexity') as PerplexityProvider;

    if (!provider || !provider.isConfigured()) {
      // Fall back to orchestrator for research
      const response = await this.providerManager.generateWithAgent(
        'orchestrator',
        [{ role: 'user', content: `Research this: ${query}` }],
        { temperature: 0.5 }
      );

      findings.push({
        id: generateId(),
        title: query,
        content: response.content,
        confidence: 0.7,
        sources: [],
      });

      return { findings, citations };
    }

    const result = await provider.research(query, {
      recency: type === 'trend_analysis' ? 'week' : 'month',
      systemPrompt: `You are a research assistant. Provide comprehensive, factual information with sources.`,
    });

    findings.push({
      id: generateId(),
      title: query,
      content: result.content,
      confidence: 0.85,
      sources: result.citations?.map(c => c.url) || [],
    });

    if (result.citations) {
      for (const citation of result.citations) {
        citations.push({
          id: generateId(),
          title: citation.title || citation.url,
          url: citation.url,
          relevance: 0.8,
        });
      }
    }

    return { findings, citations };
  }

  /**
   * Synthesize findings into a coherent summary
   */
  private async synthesizeFindings(project: ResearchProject): Promise<string> {
    const findingsText = project.findings
      .map(f => `## ${f.title}\n${f.content}`)
      .join('\n\n');

    const prompt = `Synthesize these research findings into a comprehensive executive summary:

Research Topic: ${project.topic}
Research Type: ${project.type}

Findings:
${findingsText}

Provide:
1. Key takeaways
2. Main insights
3. Recommendations
4. Areas needing more research`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    return response.content;
  }

  /**
   * Get research project by ID
   */
  getProject(id: string): ResearchProject | undefined {
    return this.activeProjects.get(id);
  }

  /**
   * Get all research projects
   */
  getAllProjects(): ResearchProject[] {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get projects by status
   */
  getProjectsByStatus(status: ResearchStatus): ResearchProject[] {
    return Array.from(this.activeProjects.values()).filter(p => p.status === status);
  }

  /**
   * Add citation to project
   */
  addCitation(projectId: string, citation: Citation): void {
    const project = this.activeProjects.get(projectId);
    if (project) {
      project.citations.push(citation);
    }
  }

  /**
   * Delete a project
   */
  deleteProject(id: string): boolean {
    return this.activeProjects.delete(id);
  }
}

export default DeepResearchService;

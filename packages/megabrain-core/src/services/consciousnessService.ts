/**
 * Consciousness Service
 * Self-awareness, introspection, and learning capabilities
 */

import { ProviderManager } from '../providers';
import { VectorService } from './vectorService';
import { generateId } from '../utils';
import type {
  ConsciousnessLevel,
  CognitiveState,
  EmotionalState,
  ConsciousnessState,
  IntrospectionType,
  Introspection,
  Reflection,
  Pattern,
  ReasoningChain,
  ReasoningStep,
  Analogy,
  AnalogicalMapping,
  Prediction,
  PredictionFactor,
} from '../types';

export interface ConsciousnessConfig {
  introspectionDepth?: number;
  patternThreshold?: number;
  analogyDomains?: string[];
}

export class ConsciousnessService {
  private providerManager: ProviderManager;
  private vectorService: VectorService;
  private config: ConsciousnessConfig;

  private currentState: ConsciousnessState;
  private introspections: Introspection[] = [];
  private reflections: Reflection[] = [];
  private patterns: Pattern[] = [];
  private reasoningChains: Map<string, ReasoningChain> = new Map();

  constructor(
    providerManager: ProviderManager,
    vectorService: VectorService,
    config?: ConsciousnessConfig
  ) {
    this.providerManager = providerManager;
    this.vectorService = vectorService;
    this.config = {
      introspectionDepth: config?.introspectionDepth || 3,
      patternThreshold: config?.patternThreshold || 0.7,
      analogyDomains: config?.analogyDomains || ['business', 'technology', 'nature', 'history'],
    };

    this.currentState = this.initializeState();
  }

  /**
   * Initialize consciousness state
   */
  private initializeState(): ConsciousnessState {
    return {
      level: 'aware',
      cognitiveState: 'focused',
      emotionalState: {
        confidence: 0.7,
        curiosity: 0.8,
        urgency: 0.3,
        satisfaction: 0.6,
        concern: 0.2,
        enthusiasm: 0.7,
      },
      activeThoughts: [],
      recentInsights: [],
      updatedAt: new Date(),
    };
  }

  /**
   * Get current consciousness state
   */
  getState(): ConsciousnessState {
    return { ...this.currentState };
  }

  /**
   * Update consciousness level
   */
  setLevel(level: ConsciousnessLevel): void {
    this.currentState.level = level;
    this.currentState.updatedAt = new Date();
  }

  /**
   * Update cognitive state
   */
  setCognitiveState(state: CognitiveState): void {
    this.currentState.cognitiveState = state;
    this.currentState.updatedAt = new Date();
  }

  /**
   * Update emotional state
   */
  updateEmotionalState(updates: Partial<EmotionalState>): void {
    this.currentState.emotionalState = {
      ...this.currentState.emotionalState,
      ...updates,
    };
    this.currentState.updatedAt = new Date();
  }

  /**
   * Perform introspection
   */
  async introspect(type: IntrospectionType, context: string): Promise<Introspection> {
    this.setCognitiveState('reflecting');

    const prompts: Record<IntrospectionType, string> = {
      reasoning_quality: `Evaluate the quality of reasoning in this context. Identify strengths, weaknesses, and potential improvements.`,
      uncertainty: `Identify areas of uncertainty in this context. What do we not know? What assumptions are being made?`,
      assumptions: `Surface hidden assumptions in this context. What is being taken for granted?`,
      alternatives: `Consider alternative approaches or perspectives for this context. What other ways could this be viewed?`,
      knowledge_gaps: `Identify knowledge gaps in this context. What information is missing?`,
      emotional_undertones: `Detect emotional aspects in this context. What feelings or biases might be influencing this?`,
      ethical_implications: `Consider ethical dimensions of this context. What moral considerations apply?`,
      meta_cognition: `Think about the thinking process itself in this context. How is reasoning being conducted?`,
    };

    const prompt = `${prompts[type]}

Context:
${context}

Provide your analysis in the following JSON format:
{
  "findings": ["finding 1", "finding 2"],
  "insights": ["insight 1", "insight 2"],
  "uncertainties": ["uncertainty 1"],
  "recommendations": ["recommendation 1"]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
    );

    let result = {
      findings: [] as string[],
      insights: [] as string[],
      uncertainties: [] as string[],
      recommendations: [] as string[],
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Use response as a single finding
      result.findings = [response.content];
    }

    const introspection: Introspection = {
      id: generateId(),
      type,
      context,
      findings: result.findings,
      insights: result.insights,
      uncertainties: result.uncertainties,
      recommendations: result.recommendations,
      createdAt: new Date(),
    };

    this.introspections.push(introspection);

    // Update emotional state based on introspection
    if (result.uncertainties.length > 2) {
      this.updateEmotionalState({ confidence: this.currentState.emotionalState.confidence - 0.1 });
    }
    if (result.insights.length > 2) {
      this.updateEmotionalState({ satisfaction: this.currentState.emotionalState.satisfaction + 0.1 });
    }

    // Add insights to active thoughts
    this.currentState.recentInsights = [
      ...result.insights.slice(0, 3),
      ...this.currentState.recentInsights.slice(0, 7),
    ];

    this.setCognitiveState('focused');
    return introspection;
  }

  /**
   * Create a reflection
   */
  async reflect(topic: string, insights: string[]): Promise<Reflection> {
    this.setCognitiveState('reflecting');

    const prompt = `Reflect on the following topic and insights:

Topic: ${topic}

Insights:
${insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Provide your reflection in the following JSON format:
{
  "patterns": ["pattern 1", "pattern 2"],
  "lessonsLearned": ["lesson 1", "lesson 2"],
  "futureConsiderations": ["consideration 1", "consideration 2"]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
    );

    let result = {
      patterns: [] as string[],
      lessonsLearned: [] as string[],
      futureConsiderations: [] as string[],
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result.lessonsLearned = [response.content];
    }

    const reflection: Reflection = {
      id: generateId(),
      topic,
      insights,
      patterns: result.patterns,
      lessonsLearned: result.lessonsLearned,
      futureConsiderations: result.futureConsiderations,
      createdAt: new Date(),
    };

    this.reflections.push(reflection);
    this.setCognitiveState('focused');

    return reflection;
  }

  /**
   * Discover patterns in data
   */
  async discoverPatterns(data: unknown[], domain: string): Promise<Pattern[]> {
    this.setCognitiveState('analyzing');

    const prompt = `Analyze the following data for patterns:

Domain: ${domain}
Data: ${JSON.stringify(data, null, 2)}

Identify recurring patterns, their frequency, and implications.
Return JSON format:
{
  "patterns": [
    {
      "name": "pattern name",
      "description": "what the pattern is",
      "occurrences": 5,
      "confidence": 0.8,
      "examples": ["example 1"],
      "implications": ["implication 1"]
    }
  ]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    let patterns: Pattern[] = [];

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        patterns = result.patterns.map((p: Omit<Pattern, 'id' | 'domain' | 'discoveredAt'>) => ({
          ...p,
          id: generateId(),
          domain,
          discoveredAt: new Date(),
        }));
      }
    } catch {
      // No patterns discovered
    }

    // Store discovered patterns
    this.patterns.push(...patterns);

    this.setCognitiveState('focused');
    return patterns;
  }

  /**
   * Start a reasoning chain
   */
  async startReasoningChain(question: string, initialPremises: string[]): Promise<ReasoningChain> {
    this.setCognitiveState('analyzing');

    const prompt = `Build a reasoning chain for this question:

Question: ${question}

Initial Premises:
${initialPremises.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Create a step-by-step logical reasoning chain. Return JSON:
{
  "steps": [
    {
      "premise": "the premise",
      "inference": "what we can conclude",
      "confidence": 0.9,
      "alternatives": ["alternative conclusion"]
    }
  ],
  "conclusion": "final answer",
  "confidence": 0.85
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 }
    );

    let result = {
      steps: [] as Omit<ReasoningStep, 'id'>[],
      conclusion: '',
      confidence: 0.5,
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result.conclusion = response.content;
    }

    const chain: ReasoningChain = {
      id: generateId(),
      question,
      premises: initialPremises,
      steps: result.steps.map(s => ({
        ...s,
        id: generateId(),
      })),
      conclusion: result.conclusion,
      confidence: result.confidence,
      createdAt: new Date(),
    };

    this.reasoningChains.set(chain.id, chain);
    this.setCognitiveState('focused');

    return chain;
  }

  /**
   * Continue a reasoning chain
   */
  async continueReasoningChain(chainId: string, newPremise: string): Promise<ReasoningChain> {
    const chain = this.reasoningChains.get(chainId);
    if (!chain) {
      throw new Error(`Reasoning chain ${chainId} not found`);
    }

    const prompt = `Continue this reasoning chain with a new premise:

Question: ${chain.question}
Current Conclusion: ${chain.conclusion}

Previous steps:
${chain.steps.map((s, i) => `${i + 1}. ${s.premise} → ${s.inference}`).join('\n')}

New Premise: ${newPremise}

How does this new premise affect the conclusion? Return JSON:
{
  "newStep": {
    "premise": "${newPremise}",
    "inference": "what we can now conclude",
    "confidence": 0.8
  },
  "updatedConclusion": "new final answer",
  "confidence": 0.75
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.4 }
    );

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        chain.steps.push({
          id: generateId(),
          ...result.newStep,
        });
        chain.conclusion = result.updatedConclusion;
        chain.confidence = result.confidence;
        chain.premises.push(newPremise);
      }
    } catch {
      // Keep existing chain
    }

    return chain;
  }

  /**
   * Find analogies
   */
  async findAnalogies(situation: string, domains?: string[]): Promise<Analogy[]> {
    this.setCognitiveState('exploring');

    const searchDomains = domains || this.config.analogyDomains || [];

    const prompt = `Find analogies for this situation from various domains:

Situation: ${situation}

Search in these domains: ${searchDomains.join(', ')}

Find similar situations and map the relationships. Return JSON:
{
  "analogies": [
    {
      "sourceSituation": "the analogous situation",
      "targetSituation": "${situation}",
      "mappings": [
        {
          "sourceElement": "element in source",
          "targetElement": "corresponding element in target",
          "relationship": "how they relate",
          "strength": 0.8
        }
      ],
      "insights": ["what we can learn from this analogy"],
      "confidence": 0.75
    }
  ]
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.7 }
    );

    let analogies: Analogy[] = [];

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        analogies = result.analogies.map((a: Omit<Analogy, 'id'>) => ({
          ...a,
          id: generateId(),
        }));
      }
    } catch {
      // No analogies found
    }

    this.setCognitiveState('focused');
    return analogies;
  }

  /**
   * Predict outcome
   */
  async predictOutcome(scenario: string, factors: PredictionFactor[]): Promise<Prediction> {
    this.setCognitiveState('planning');

    const prompt = `Predict the outcome of this scenario:

Scenario: ${scenario}

Factors to consider:
${factors.map(f => `- ${f.name} (influence: ${f.influence}, certainty: ${f.certainty})`).join('\n')}

Provide your prediction. Return JSON:
{
  "outcome": "most likely outcome",
  "probability": 0.7,
  "alternatives": ["alternative outcome 1", "alternative outcome 2"],
  "timeframe": "when this might occur"
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.6 }
    );

    let result = {
      outcome: '',
      probability: 0.5,
      alternatives: [] as string[],
      timeframe: undefined as string | undefined,
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result.outcome = response.content;
    }

    const prediction: Prediction = {
      id: generateId(),
      scenario,
      outcome: result.outcome,
      probability: result.probability,
      factors,
      alternatives: result.alternatives,
      timeframe: result.timeframe,
      createdAt: new Date(),
    };

    this.setCognitiveState('focused');
    return prediction;
  }

  /**
   * Apply learning from past experiences
   */
  async applyLearning(currentSituation: string, relevantMemories: string[]): Promise<{
    recommendations: string[];
    appliedPatterns: string[];
    confidence: number;
  }> {
    this.setCognitiveState('synthesizing');

    const prompt = `Apply learning from past experiences to the current situation:

Current Situation: ${currentSituation}

Relevant Past Experiences:
${relevantMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Known Patterns:
${this.patterns.slice(-5).map(p => `- ${p.name}: ${p.description}`).join('\n')}

What should be done based on past learning? Return JSON:
{
  "recommendations": ["recommendation 1", "recommendation 2"],
  "appliedPatterns": ["pattern name that applies"],
  "confidence": 0.8
}`;

    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    let result = {
      recommendations: [] as string[],
      appliedPatterns: [] as string[],
      confidence: 0.5,
    };

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result.recommendations = [response.content];
    }

    this.setCognitiveState('focused');
    return result;
  }

  /**
   * Get recent introspections
   */
  getIntrospections(limit: number = 10): Introspection[] {
    return this.introspections.slice(-limit);
  }

  /**
   * Get recent reflections
   */
  getReflections(limit: number = 10): Reflection[] {
    return this.reflections.slice(-limit);
  }

  /**
   * Get discovered patterns
   */
  getPatterns(domain?: string): Pattern[] {
    if (domain) {
      return this.patterns.filter(p => p.domain === domain);
    }
    return [...this.patterns];
  }

  /**
   * Get reasoning chain
   */
  getReasoningChain(id: string): ReasoningChain | undefined {
    return this.reasoningChains.get(id);
  }

  /**
   * Get all active reasoning chains
   */
  getAllReasoningChains(): ReasoningChain[] {
    return Array.from(this.reasoningChains.values());
  }

  /**
   * Reset consciousness state
   */
  reset(): void {
    this.currentState = this.initializeState();
    this.introspections = [];
    this.reflections = [];
    this.patterns = [];
    this.reasoningChains.clear();
  }
}

export default ConsciousnessService;

/**
 * Orchestrator Service
 * Central coordination hub for all MEGABRAIN operations
 */

import { ProviderManager, ChatMessage, GenerateOptions, GenerateResult } from '../providers';
import { DatabaseService } from './databaseService';
import { VectorService } from './vectorService';
import { generateId, CircuitBreaker, retry } from '../utils';
import {
  MEGABRAIN_CONFIG,
  AGENT_CONFIGS,
  ORCHESTRATOR_SYSTEM_PROMPT,
  AGENT_PROVIDER_MAP,
} from '../config';
import type {
  AgentType,
  AgentResponse,
  Task,
  TaskPlan,
  TaskStep,
  TaskResult,
  Tool,
  ToolCall,
  ToolResult,
  Workspace,
  Message,
  Document,
  ConsciousnessState,
} from '../types';

export interface OrchestratorContext {
  workspaceId: string;
  conversationId?: string;
  consciousnessState?: ConsciousnessState;
  recentMemories?: string[];
  activeDocuments?: string[];
}

export interface ProcessMessageResult {
  response: string;
  agentsUsed: AgentType[];
  tokensUsed: { input: number; output: number };
  duration: number;
  toolsUsed?: string[];
  documentsCreated?: string[];
  tasksCreated?: string[];
}

export class OrchestratorService {
  private providerManager: ProviderManager;
  private database: DatabaseService;
  private vectorService: VectorService;
  private circuitBreaker: CircuitBreaker;
  private activeTasks: Map<string, Task> = new Map();
  private tools: Map<string, Tool> = new Map();

  constructor(
    providerManager: ProviderManager,
    database: DatabaseService,
    vectorService: VectorService
  ) {
    this.providerManager = providerManager;
    this.database = database;
    this.vectorService = vectorService;
    this.circuitBreaker = new CircuitBreaker(
      MEGABRAIN_CONFIG.circuitBreakerThreshold,
      MEGABRAIN_CONFIG.circuitBreakerResetMs
    );

    this.initializeTools();
  }

  /**
   * Initialize orchestrator tools
   */
  private initializeTools(): void {
    // Delegation tools
    this.tools.set('delegate_to_coder', {
      name: 'delegate_to_coder',
      description: 'Delegate a coding task to the Coder agent (GPT-4.1)',
      parameters: [
        { name: 'task', type: 'string', description: 'The coding task to perform', required: true },
        { name: 'context', type: 'string', description: 'Additional context for the task', required: false },
      ],
      handler: async (params) => this.delegateTask('coder', params.task as string, params.context as string),
    });

    this.tools.set('delegate_to_researcher', {
      name: 'delegate_to_researcher',
      description: 'Delegate a research task to the Researcher agent (Sonar Pro)',
      parameters: [
        { name: 'query', type: 'string', description: 'The research query', required: true },
        { name: 'domains', type: 'array', description: 'Domain filters', required: false },
      ],
      handler: async (params) => this.delegateTask('researcher', params.query as string, ''),
    });

    this.tools.set('delegate_to_market_analyst', {
      name: 'delegate_to_market_analyst',
      description: 'Delegate a market analysis task to the Market Analyst agent (Grok)',
      parameters: [
        { name: 'query', type: 'string', description: 'The market analysis query', required: true },
        { name: 'symbols', type: 'array', description: 'Symbols to analyze', required: false },
      ],
      handler: async (params) => this.delegateTask('market_analyst', params.query as string, ''),
    });

    // Document tools
    this.tools.set('create_document', {
      name: 'create_document',
      description: 'Create a new document in the workspace',
      parameters: [
        { name: 'title', type: 'string', description: 'Document title', required: true },
        { name: 'content', type: 'string', description: 'Document content', required: true },
        { name: 'type', type: 'string', description: 'Document type', required: false },
      ],
      handler: async (params) => ({ created: true, title: params.title }),
    });

    // Task tools
    this.tools.set('create_task', {
      name: 'create_task',
      description: 'Create a tracked task in the workspace',
      parameters: [
        { name: 'title', type: 'string', description: 'Task title', required: true },
        { name: 'description', type: 'string', description: 'Task description', required: false },
        { name: 'priority', type: 'string', description: 'Task priority', required: false },
      ],
      handler: async (params) => ({ created: true, title: params.title }),
    });

    // Lifecycle tools
    this.tools.set('update_lifecycle_stage', {
      name: 'update_lifecycle_stage',
      description: 'Update the lifecycle stage of a startup',
      parameters: [
        { name: 'startup_id', type: 'string', description: 'Startup ID', required: true },
        { name: 'stage', type: 'string', description: 'New lifecycle stage', required: true },
      ],
      handler: async (params) => ({ updated: true, startup_id: params.startup_id, stage: params.stage }),
    });

    // Approval tools
    this.tools.set('request_human_approval', {
      name: 'request_human_approval',
      description: 'Request approval from a human for a decision',
      parameters: [
        { name: 'decision', type: 'string', description: 'Decision requiring approval', required: true },
        { name: 'options', type: 'array', description: 'Available options', required: false },
      ],
      handler: async (params) => ({ pending: true, decision: params.decision }),
    });

    // Consciousness tools
    this.tools.set('introspect', {
      name: 'introspect',
      description: 'Perform self-examination of reasoning',
      parameters: [
        { name: 'type', type: 'string', description: 'Type of introspection', required: true },
        { name: 'context', type: 'string', description: 'Context for introspection', required: true },
      ],
      handler: async (params) => ({ introspection: params.type, context: params.context }),
    });

    this.tools.set('reflect', {
      name: 'reflect',
      description: 'Create a reflection on insights',
      parameters: [
        { name: 'topic', type: 'string', description: 'Topic of reflection', required: true },
        { name: 'insights', type: 'array', description: 'Insights to reflect on', required: true },
      ],
      handler: async (params) => ({ reflected: true, topic: params.topic }),
    });

    this.tools.set('discover_patterns', {
      name: 'discover_patterns',
      description: 'Analyze data for patterns',
      parameters: [
        { name: 'data', type: 'string', description: 'Data to analyze', required: true },
        { name: 'domain', type: 'string', description: 'Domain for pattern discovery', required: true },
      ],
      handler: async (params) => ({ patterns: [], domain: params.domain }),
    });

    this.tools.set('predict_outcome', {
      name: 'predict_outcome',
      description: 'Predict future outcomes',
      parameters: [
        { name: 'scenario', type: 'string', description: 'Scenario to predict', required: true },
        { name: 'factors', type: 'array', description: 'Factors to consider', required: false },
      ],
      handler: async (params) => ({ prediction: 'pending', scenario: params.scenario }),
    });

    this.tools.set('apply_learning', {
      name: 'apply_learning',
      description: 'Apply learning from past experiences',
      parameters: [
        { name: 'situation', type: 'string', description: 'Current situation', required: true },
        { name: 'memories', type: 'array', description: 'Relevant memories', required: false },
      ],
      handler: async (params) => ({ applied: true, situation: params.situation }),
    });

    this.tools.set('find_analogies', {
      name: 'find_analogies',
      description: 'Discover analogous situations',
      parameters: [
        { name: 'situation', type: 'string', description: 'Current situation', required: true },
        { name: 'domains', type: 'array', description: 'Domains to search', required: false },
      ],
      handler: async (params) => ({ analogies: [], situation: params.situation }),
    });

    this.tools.set('start_reasoning_chain', {
      name: 'start_reasoning_chain',
      description: 'Build explicit reasoning chains',
      parameters: [
        { name: 'question', type: 'string', description: 'Question to reason about', required: true },
        { name: 'premises', type: 'array', description: 'Initial premises', required: true },
      ],
      handler: async (params) => ({ reasoning_started: true, question: params.question }),
    });

    this.tools.set('start_deep_research', {
      name: 'start_deep_research',
      description: 'Initiate a deep research project',
      parameters: [
        { name: 'topic', type: 'string', description: 'Research topic', required: true },
        { name: 'type', type: 'string', description: 'Research type', required: true },
        { name: 'depth', type: 'string', description: 'Research depth', required: false },
      ],
      handler: async (params) => ({ started: true, topic: params.topic, type: params.type }),
    });
  }

  /**
   * Process a user message
   */
  async processMessage(
    workspaceId: string,
    message: string,
    context?: OrchestratorContext
  ): Promise<ProcessMessageResult> {
    const startTime = Date.now();
    const agentsUsed: AgentType[] = ['orchestrator'];
    const toolsUsed: string[] = [];
    let totalTokensInput = 0;
    let totalTokensOutput = 0;

    // Build conversation messages
    const messages: ChatMessage[] = [];

    // Add recent memories as context
    if (context?.recentMemories && context.recentMemories.length > 0) {
      const memoryContext = context.recentMemories.join('\n');
      messages.push({
        role: 'system',
        content: `Relevant memories:\n${memoryContext}`,
      });
    }

    // Add the user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Generate orchestrator response
    const response = await this.circuitBreaker.execute(async () => {
      return retry(
        async () => {
          return this.providerManager.generateWithAgent('orchestrator', messages, {
            systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
            tools: Array.from(this.tools.values()),
            temperature: AGENT_CONFIGS.orchestrator.temperature,
            maxTokens: AGENT_CONFIGS.orchestrator.maxTokens,
          });
        },
        { maxAttempts: MEGABRAIN_CONFIG.retryAttempts }
      );
    });

    totalTokensInput += response.tokensUsed.input;
    totalTokensOutput += response.tokensUsed.output;

    // Process tool calls if any
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const tool = this.tools.get(toolCall.tool);
        if (tool) {
          toolsUsed.push(toolCall.tool);

          // Handle delegation tools specially
          if (toolCall.tool.startsWith('delegate_to_')) {
            const agent = toolCall.tool.replace('delegate_to_', '') as AgentType;
            if (!agentsUsed.includes(agent)) {
              agentsUsed.push(agent);
            }
          }

          // Execute the tool
          await tool.handler(toolCall.parameters);
        }
      }
    }

    // Store the message and response
    if (context?.conversationId) {
      await this.database.addMessage({
        conversationId: context.conversationId,
        role: 'user',
        content: message,
      });

      await this.database.addMessage({
        conversationId: context.conversationId,
        role: 'assistant',
        content: response.content,
        metadata: {
          agentsInvolved: agentsUsed,
          toolsUsed,
          tokensUsed: { input: totalTokensInput, output: totalTokensOutput },
        },
      });
    }

    // Index the conversation for memory
    if (this.vectorService.isConfigured()) {
      await this.vectorService.store(workspaceId, message, {
        source: 'conversation',
        type: 'user_message',
        conversationId: context?.conversationId,
      });

      await this.vectorService.store(workspaceId, response.content, {
        source: 'conversation',
        type: 'assistant_response',
        conversationId: context?.conversationId,
      });
    }

    return {
      response: response.content,
      agentsUsed,
      tokensUsed: { input: totalTokensInput, output: totalTokensOutput },
      duration: Date.now() - startTime,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
    };
  }

  /**
   * Delegate a task to a specific agent
   */
  async delegateTask(
    agent: AgentType,
    task: string,
    context?: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    if (!this.providerManager.isAgentAvailable(agent)) {
      throw new Error(`Agent ${agent} is not available`);
    }

    const agentConfig = AGENT_CONFIGS[agent];
    const systemPrompt = `You are the ${agentConfig.name} agent.
Role: ${agentConfig.role}
Capabilities: ${agentConfig.capabilities.join(', ')}

${context ? `Context: ${context}` : ''}

Respond to the task directly and concisely.`;

    const response = await this.circuitBreaker.execute(async () => {
      return this.providerManager.generateWithAgent(
        agent,
        [{ role: 'user', content: task }],
        {
          systemPrompt,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
        }
      );
    });

    return {
      agent,
      content: response.content,
      tokensUsed: response.tokensUsed,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Plan task execution for a complex goal
   */
  async planTasks(goal: string): Promise<TaskPlan> {
    const response = await this.providerManager.generateWithAgent(
      'orchestrator',
      [
        {
          role: 'user',
          content: `Create a detailed execution plan for this goal:

${goal}

Return a JSON object with this structure:
{
  "goal": "the goal",
  "steps": [
    {
      "id": "step_1",
      "description": "what to do",
      "agent": "orchestrator|coder|researcher|market_analyst",
      "dependencies": [],
      "estimatedDuration": 60
    }
  ],
  "estimatedDuration": 300,
  "requiredAgents": ["orchestrator"]
}`,
        },
      ],
      {
        systemPrompt: 'You are a task planning expert. Return only valid JSON.',
        temperature: 0.3,
      }
    );

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TaskPlan;
      }
    } catch {
      // Fall back to a simple plan
    }

    return {
      goal,
      steps: [
        {
          id: 'step_1',
          description: goal,
          agent: 'orchestrator',
          dependencies: [],
          estimatedDuration: 300,
        },
      ],
      estimatedDuration: 300,
      requiredAgents: ['orchestrator'],
    };
  }

  /**
   * Execute a planned task
   */
  async executeTask(task: TaskStep, context?: string): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const response = await this.delegateTask(
        task.agent as AgentType,
        task.description,
        context
      );

      return {
        success: true,
        output: response.content,
        duration: Date.now() - startTime,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        output: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute a full plan
   */
  async executePlan(plan: TaskPlan): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const completedSteps = new Set<string>();
    let context = '';

    // Sort steps by dependencies
    const orderedSteps = this.topologicalSort(plan.steps);

    for (const step of orderedSteps) {
      // Check dependencies
      const dependenciesMet = step.dependencies.every(dep => completedSteps.has(dep));
      if (!dependenciesMet) {
        results.push({
          success: false,
          output: `Dependencies not met: ${step.dependencies.filter(d => !completedSteps.has(d)).join(', ')}`,
          duration: 0,
        });
        continue;
      }

      // Execute the step
      const result = await this.executeTask(step, context);
      results.push(result);

      if (result.success) {
        completedSteps.add(step.id);
        context += `\n${step.description}: ${result.output}\n`;
      }
    }

    return results;
  }

  /**
   * Topological sort for task dependencies
   */
  private topologicalSort(steps: TaskStep[]): TaskStep[] {
    const sorted: TaskStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const stepMap = new Map(steps.map(s => [s.id, s]));

    const visit = (step: TaskStep): void => {
      if (visited.has(step.id)) return;
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected at step ${step.id}`);
      }

      visiting.add(step.id);

      for (const depId of step.dependencies) {
        const dep = stepMap.get(depId);
        if (dep) {
          visit(dep);
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return sorted;
  }

  /**
   * Synthesize results from multiple agents
   */
  synthesizeResults(results: AgentResponse[]): string {
    if (results.length === 0) {
      return '';
    }

    if (results.length === 1) {
      return results[0].content;
    }

    // Build a synthesis prompt
    const agentOutputs = results
      .map(r => `**${r.agent.toUpperCase()}:**\n${r.content}`)
      .join('\n\n');

    // For now, just concatenate. In a more sophisticated version,
    // we'd use the orchestrator to synthesize.
    return `## Combined Analysis\n\n${agentOutputs}`;
  }

  /**
   * Get the recommended agent for a task
   */
  getAgentForTask(task: string): AgentType {
    const lowercaseTask = task.toLowerCase();

    if (
      lowercaseTask.includes('code') ||
      lowercaseTask.includes('implement') ||
      lowercaseTask.includes('build') ||
      lowercaseTask.includes('develop') ||
      lowercaseTask.includes('fix bug')
    ) {
      return 'coder';
    }

    if (
      lowercaseTask.includes('research') ||
      lowercaseTask.includes('find') ||
      lowercaseTask.includes('search') ||
      lowercaseTask.includes('learn about')
    ) {
      return 'researcher';
    }

    if (
      lowercaseTask.includes('market') ||
      lowercaseTask.includes('trading') ||
      lowercaseTask.includes('sentiment') ||
      lowercaseTask.includes('trend') ||
      lowercaseTask.includes('price')
    ) {
      return 'market_analyst';
    }

    return 'orchestrator';
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentType[] {
    return this.providerManager.getAvailableAgents();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): 'closed' | 'open' | 'half-open' {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

export default OrchestratorService;

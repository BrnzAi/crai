/**
 * Database Service
 * Central service for all data persistence operations
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import { generateId } from '../utils';
import type {
  Workspace,
  WorkspaceType,
  WorkspaceStatus,
  Conversation,
  Message,
  MessageRole,
  Document,
  DocumentType,
  Task,
  TaskStatus,
  TaskPriority,
  VectorEntry,
  VectorMetadata,
} from '../types';
import type {
  EmpirePortfolio,
  CreatePortfolioInput,
  EmpireStartupFinancials,
  CreateFinancialsInput,
  EmpireWeeklyTasks,
  Empire12MonthPlan,
  EmpireGithubRepo,
  EmpireGithubCommit,
  EmpireGithubPR,
  EmpireGithubDailySummary,
  EmpireTrdrCapital,
  TreasuryStatus,
  EmpireCapitalAllocation,
  CreateAllocationInput,
  EmpireWeeklyOrders,
  EmpireDecision,
  CreateDecisionInput,
  EmpireAifiPipeline,
  CreatePipelineInput,
  EmpireSummary,
} from '../types/empireTypes';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolMin?: number;
  poolMax?: number;
}

export class DatabaseService {
  private pool: Pool | null = null;
  private initialized: boolean = false;

  constructor(private config?: DatabaseConfig) {}

  /**
   * Initialize the database connection pool
   */
  async initialize(config?: DatabaseConfig): Promise<void> {
    const dbConfig = config || this.config;
    if (!dbConfig) {
      throw new Error('Database configuration is required');
    }

    const poolConfig: PoolConfig = {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
      min: dbConfig.poolMin || 2,
      max: dbConfig.poolMax || 10,
    };

    this.pool = new Pool(poolConfig);
    this.initialized = true;

    // Test connection
    await this.query('SELECT NOW()');
  }

  /**
   * Initialize from environment variables
   */
  async initializeFromEnv(): Promise<void> {
    const config: DatabaseConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'megabrain',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.POSTGRES_SSL === 'true',
      poolMin: parseInt(process.env.POSTGRES_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.POSTGRES_POOL_MAX || '10', 10),
    };

    await this.initialize(config);
  }

  /**
   * Execute a query
   */
  async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    return this.pool.query<T>(text, params);
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }

  /**
   * Check if database is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Workspace Operations
  // ============================================================================

  async createWorkspace(input: {
    name: string;
    description?: string;
    type?: WorkspaceType;
  }): Promise<Workspace> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<Workspace>(
      `INSERT INTO megabrain_workspaces (id, name, description, type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, input.name, input.description || null, input.type || 'startup', 'active', now, now]
    );

    return result.rows[0];
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    const result = await this.query<Workspace>(
      'SELECT * FROM megabrain_workspaces WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async listWorkspaces(status?: WorkspaceStatus): Promise<Workspace[]> {
    let query = 'SELECT * FROM megabrain_workspaces';
    const params: unknown[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await this.query<Workspace>(query, params);
    return result.rows;
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.getWorkspace(id);
    }

    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const result = await this.query<Workspace>(
      `UPDATE megabrain_workspaces SET ${fields.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM megabrain_workspaces WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  async createConversation(workspaceId: string, title?: string): Promise<Conversation> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<Conversation>(
      `INSERT INTO megabrain_conversations (id, workspace_id, title, created_at, updated_at, message_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, workspaceId, title || null, now, now, 0]
    );

    return result.rows[0];
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const result = await this.query<Conversation>(
      'SELECT * FROM megabrain_conversations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async listConversations(workspaceId: string): Promise<Conversation[]> {
    const result = await this.query<Conversation>(
      'SELECT * FROM megabrain_conversations WHERE workspace_id = $1 ORDER BY updated_at DESC',
      [workspaceId]
    );
    return result.rows;
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  async addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    agentType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Message> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<Message>(
      `INSERT INTO megabrain_messages (id, conversation_id, role, content, agent_type, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        input.conversationId,
        input.role,
        input.content,
        input.agentType || null,
        JSON.stringify(input.metadata || {}),
        now,
      ]
    );

    // Update conversation message count
    await this.query(
      `UPDATE megabrain_conversations
       SET message_count = message_count + 1, updated_at = $1
       WHERE id = $2`,
      [now, input.conversationId]
    );

    return result.rows[0];
  }

  async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
    const result = await this.query<Message>(
      'SELECT * FROM megabrain_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
      [conversationId, limit]
    );
    return result.rows.reverse();
  }

  // ============================================================================
  // Document Operations
  // ============================================================================

  async createDocument(input: {
    workspaceId: string;
    title: string;
    content: string;
    type?: DocumentType;
    metadata?: Record<string, unknown>;
  }): Promise<Document> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<Document>(
      `INSERT INTO megabrain_documents (id, workspace_id, title, content, type, version, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        input.workspaceId,
        input.title,
        input.content,
        input.type || 'note',
        1,
        JSON.stringify(input.metadata || {}),
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  async getDocument(id: string): Promise<Document | null> {
    const result = await this.query<Document>(
      'SELECT * FROM megabrain_documents WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async listDocuments(workspaceId: string, type?: DocumentType): Promise<Document[]> {
    let query = 'SELECT * FROM megabrain_documents WHERE workspace_id = $1';
    const params: unknown[] = [workspaceId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await this.query<Document>(query, params);
    return result.rows;
  }

  async updateDocument(id: string, updates: { title?: string; content?: string }): Promise<Document | null> {
    const doc = await this.getDocument(id);
    if (!doc) return null;

    const result = await this.query<Document>(
      `UPDATE megabrain_documents
       SET title = $1, content = $2, version = version + 1, updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [updates.title || doc.title, updates.content || doc.content, new Date(), id]
    );

    return result.rows[0] || null;
  }

  // ============================================================================
  // Task Operations
  // ============================================================================

  async createTask(input: {
    workspaceId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignedAgent?: string;
  }): Promise<Task> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<Task>(
      `INSERT INTO megabrain_tasks (id, workspace_id, title, description, status, priority, assigned_agent, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        input.workspaceId,
        input.title,
        input.description || null,
        'pending',
        input.priority || 'medium',
        input.assignedAgent || null,
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  async updateTaskStatus(id: string, status: TaskStatus, result?: string): Promise<Task | null> {
    const now = new Date();
    const completedAt = ['completed', 'failed'].includes(status) ? now : null;

    const queryResult = await this.query<Task>(
      `UPDATE megabrain_tasks
       SET status = $1, result = $2, updated_at = $3, completed_at = $4
       WHERE id = $5
       RETURNING *`,
      [status, result ? JSON.stringify(result) : null, now, completedAt, id]
    );

    return queryResult.rows[0] || null;
  }

  async listTasks(workspaceId: string, status?: TaskStatus): Promise<Task[]> {
    let query = 'SELECT * FROM megabrain_tasks WHERE workspace_id = $1';
    const params: unknown[] = [workspaceId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.query<Task>(query, params);
    return result.rows;
  }

  // ============================================================================
  // Vector Operations
  // ============================================================================

  async storeVector(input: {
    workspaceId: string;
    content: string;
    embedding: number[];
    metadata: VectorMetadata;
  }): Promise<string> {
    const id = generateId();
    const now = new Date();

    await this.query(
      `INSERT INTO megabrain_vectors (id, workspace_id, content, embedding, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        input.workspaceId,
        input.content,
        JSON.stringify(input.embedding),
        JSON.stringify(input.metadata),
        now,
      ]
    );

    return id;
  }

  async getVectors(workspaceId: string): Promise<VectorEntry[]> {
    const result = await this.query<VectorEntry>(
      'SELECT * FROM megabrain_vectors WHERE workspace_id = $1',
      [workspaceId]
    );
    return result.rows;
  }

  async deleteVectors(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    await this.query(
      'DELETE FROM megabrain_vectors WHERE id = ANY($1)',
      [ids]
    );
  }

  // ============================================================================
  // Empire Portfolio Operations
  // ============================================================================

  async createStartup(input: CreatePortfolioInput): Promise<EmpirePortfolio> {
    const now = new Date();

    const result = await this.query<EmpirePortfolio>(
      `INSERT INTO empire_portfolio (id, name, description, status, founder_status, founder_name, funding_source, github_repo, website, tags, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.id,
        input.name,
        input.description || null,
        input.status || 'IDEA',
        input.founder_status || 'NONE',
        input.founder_name || null,
        input.funding_source || 'SELF',
        input.github_repo || null,
        input.website || null,
        JSON.stringify(input.tags || []),
        JSON.stringify(input.metadata || {}),
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  async getStartup(id: string): Promise<EmpirePortfolio | null> {
    const result = await this.query<EmpirePortfolio>(
      'SELECT * FROM empire_portfolio WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async listStartups(): Promise<EmpirePortfolio[]> {
    const result = await this.query<EmpirePortfolio>(
      'SELECT * FROM empire_portfolio ORDER BY name'
    );
    return result.rows;
  }

  async updateStartup(id: string, updates: Partial<EmpirePortfolio>): Promise<EmpirePortfolio | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        if (key === 'tags' || key === 'metadata') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.getStartup(id);
    }

    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const result = await this.query<EmpirePortfolio>(
      `UPDATE empire_portfolio SET ${fields.join(', ')} WHERE id = $${paramCount + 1} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  async deleteStartup(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM empire_portfolio WHERE id = $1',
      [id]
    );
    return result.rowCount! > 0;
  }

  // ============================================================================
  // Empire Financial Operations
  // ============================================================================

  async logFinancials(input: CreateFinancialsInput): Promise<EmpireStartupFinancials> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<EmpireStartupFinancials>(
      `INSERT INTO empire_startup_financials
       (id, startup_id, month, mrr_actual, mrr_target, arr_actual, burn_rate, revenue_total,
        customers_total, customers_new, customers_churned, churn_rate, ltv, cac, ltv_cac_ratio,
        trdr_funding_received, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (startup_id, month) DO UPDATE SET
         mrr_actual = EXCLUDED.mrr_actual,
         mrr_target = EXCLUDED.mrr_target,
         arr_actual = EXCLUDED.arr_actual,
         burn_rate = EXCLUDED.burn_rate,
         revenue_total = EXCLUDED.revenue_total,
         customers_total = EXCLUDED.customers_total,
         customers_new = EXCLUDED.customers_new,
         customers_churned = EXCLUDED.customers_churned,
         churn_rate = EXCLUDED.churn_rate,
         ltv = EXCLUDED.ltv,
         cac = EXCLUDED.cac,
         ltv_cac_ratio = EXCLUDED.ltv_cac_ratio,
         trdr_funding_received = EXCLUDED.trdr_funding_received,
         notes = EXCLUDED.notes
       RETURNING *`,
      [
        id,
        input.startup_id,
        input.month,
        input.mrr_actual || 0,
        input.mrr_target || 0,
        input.arr_actual || 0,
        input.burn_rate || 0,
        input.revenue_total || 0,
        input.customers_total || 0,
        input.customers_new || 0,
        input.customers_churned || 0,
        input.churn_rate || 0,
        input.ltv || 0,
        input.cac || 0,
        input.ltv_cac_ratio || 0,
        input.trdr_funding_received || 0,
        input.notes || null,
        now,
      ]
    );

    return result.rows[0];
  }

  async getFinancials(startupId: string): Promise<EmpireStartupFinancials[]> {
    const result = await this.query<EmpireStartupFinancials>(
      'SELECT * FROM empire_startup_financials WHERE startup_id = $1 ORDER BY month DESC',
      [startupId]
    );
    return result.rows;
  }

  // ============================================================================
  // Treasury Operations
  // ============================================================================

  async getTreasuryStatus(): Promise<TreasuryStatus | null> {
    const result = await this.query<EmpireTrdrCapital>(
      'SELECT * FROM empire_trdr_capital ORDER BY date DESC LIMIT 1'
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      total_capital: Number(row.total_capital),
      daily_pnl: Number(row.daily_pnl),
      monthly_pnl: Number(row.monthly_pnl),
      monthly_pnl_percent: Number(row.monthly_pnl_percent),
      win_rate: Number(row.win_rate),
      active_positions: row.active_positions,
      available_for_deployment: Number(row.available_for_deployment),
      reserve_amount: Number(row.reserve_amount),
      deployed_to_startups: Number(row.deployed_to_startups),
    };
  }

  async updateTreasury(input: {
    total_capital: number;
    daily_pnl?: number;
    monthly_pnl?: number;
    win_rate?: number;
    active_positions?: number;
    notes?: string;
  }): Promise<EmpireTrdrCapital> {
    const id = generateId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate derived values
    const monthlyPnl = input.monthly_pnl || 0;
    const monthlyPnlPercent = input.total_capital > 0
      ? (monthlyPnl / input.total_capital) * 100
      : 0;
    const availableForDeployment = input.total_capital * 0.075; // 7.5%
    const reserveAmount = input.total_capital * 0.25; // 25%

    const result = await this.query<EmpireTrdrCapital>(
      `INSERT INTO empire_trdr_capital
       (id, date, total_capital, daily_pnl, monthly_pnl, monthly_pnl_percent, win_rate,
        active_positions, available_for_deployment, reserve_amount, deployed_to_startups, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (date) DO UPDATE SET
         total_capital = EXCLUDED.total_capital,
         daily_pnl = EXCLUDED.daily_pnl,
         monthly_pnl = EXCLUDED.monthly_pnl,
         monthly_pnl_percent = EXCLUDED.monthly_pnl_percent,
         win_rate = EXCLUDED.win_rate,
         active_positions = EXCLUDED.active_positions,
         available_for_deployment = EXCLUDED.available_for_deployment,
         reserve_amount = EXCLUDED.reserve_amount,
         notes = EXCLUDED.notes
       RETURNING *`,
      [
        id,
        today,
        input.total_capital,
        input.daily_pnl || 0,
        monthlyPnl,
        monthlyPnlPercent,
        input.win_rate || 0,
        input.active_positions || 0,
        availableForDeployment,
        reserveAmount,
        0, // deployed_to_startups
        input.notes || null,
        new Date(),
      ]
    );

    return result.rows[0];
  }

  async getCapitalHistory(days: number = 30): Promise<EmpireTrdrCapital[]> {
    const result = await this.query<EmpireTrdrCapital>(
      `SELECT * FROM empire_trdr_capital
       WHERE date >= NOW() - INTERVAL '${days} days'
       ORDER BY date DESC`
    );
    return result.rows;
  }

  // ============================================================================
  // Allocation Operations
  // ============================================================================

  async createAllocation(input: CreateAllocationInput): Promise<EmpireCapitalAllocation> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<EmpireCapitalAllocation>(
      `INSERT INTO empire_capital_allocations
       (id, startup_id, amount, allocation_type, purpose, approved_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        input.startup_id,
        input.amount,
        input.allocation_type,
        input.purpose || null,
        input.approved_by || 'MEGABRAIN',
        'PENDING',
        now,
      ]
    );

    return result.rows[0];
  }

  async getAllocations(startupId?: string): Promise<EmpireCapitalAllocation[]> {
    let query = 'SELECT * FROM empire_capital_allocations';
    const params: unknown[] = [];

    if (startupId) {
      query += ' WHERE startup_id = $1';
      params.push(startupId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.query<EmpireCapitalAllocation>(query, params);
    return result.rows;
  }

  async disburseAllocation(id: string): Promise<EmpireCapitalAllocation | null> {
    const now = new Date();

    const result = await this.query<EmpireCapitalAllocation>(
      `UPDATE empire_capital_allocations
       SET status = 'DISBURSED', disbursed_at = $1
       WHERE id = $2
       RETURNING *`,
      [now, id]
    );

    return result.rows[0] || null;
  }

  // ============================================================================
  // Weekly Orders Operations
  // ============================================================================

  async getWeeklyOrders(weekNumber: number, year: number): Promise<EmpireWeeklyOrders | null> {
    const result = await this.query<EmpireWeeklyOrders>(
      'SELECT * FROM empire_weekly_orders WHERE week_number = $1 AND year = $2',
      [weekNumber, year]
    );
    return result.rows[0] || null;
  }

  async saveWeeklyOrders(orders: Omit<EmpireWeeklyOrders, 'id'>): Promise<EmpireWeeklyOrders> {
    const id = generateId();

    const result = await this.query<EmpireWeeklyOrders>(
      `INSERT INTO empire_weekly_orders
       (id, week_number, year, generated_at, trdr_status_json, portfolio_status_json, orders_json,
        capital_allocation_json, alerts_json, founder_status_json, next_decision_point, full_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (week_number, year) DO UPDATE SET
         generated_at = EXCLUDED.generated_at,
         trdr_status_json = EXCLUDED.trdr_status_json,
         portfolio_status_json = EXCLUDED.portfolio_status_json,
         orders_json = EXCLUDED.orders_json,
         capital_allocation_json = EXCLUDED.capital_allocation_json,
         alerts_json = EXCLUDED.alerts_json,
         founder_status_json = EXCLUDED.founder_status_json,
         next_decision_point = EXCLUDED.next_decision_point,
         full_report = EXCLUDED.full_report
       RETURNING *`,
      [
        id,
        orders.week_number,
        orders.year,
        orders.generated_at,
        JSON.stringify(orders.trdr_status_json),
        JSON.stringify(orders.portfolio_status_json),
        JSON.stringify(orders.orders_json),
        JSON.stringify(orders.capital_allocation_json),
        JSON.stringify(orders.alerts_json),
        JSON.stringify(orders.founder_status_json),
        orders.next_decision_point || null,
        orders.full_report || null,
      ]
    );

    return result.rows[0];
  }

  async executeWeeklyOrders(id: string, notes?: string): Promise<EmpireWeeklyOrders | null> {
    const now = new Date();

    const result = await this.query<EmpireWeeklyOrders>(
      `UPDATE empire_weekly_orders
       SET executed = true, executed_at = $1, execution_notes = $2
       WHERE id = $3
       RETURNING *`,
      [now, notes || null, id]
    );

    return result.rows[0] || null;
  }

  async getOrdersHistory(limit: number = 12): Promise<EmpireWeeklyOrders[]> {
    const result = await this.query<EmpireWeeklyOrders>(
      'SELECT * FROM empire_weekly_orders ORDER BY year DESC, week_number DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  // ============================================================================
  // Decision Operations
  // ============================================================================

  async logDecision(input: CreateDecisionInput): Promise<EmpireDecision> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<EmpireDecision>(
      `INSERT INTO empire_decisions
       (id, decision_type, startup_id, decision_summary, reasoning, data_inputs_json, outcome, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        input.decision_type,
        input.startup_id || null,
        input.decision_summary,
        input.reasoning || null,
        JSON.stringify(input.data_inputs_json || {}),
        input.outcome || null,
        now,
      ]
    );

    return result.rows[0];
  }

  async getDecisions(limit: number = 50): Promise<EmpireDecision[]> {
    const result = await this.query<EmpireDecision>(
      'SELECT * FROM empire_decisions ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  // ============================================================================
  // Pipeline Operations
  // ============================================================================

  async createPipelineIdea(input: CreatePipelineInput): Promise<EmpireAifiPipeline> {
    const id = generateId();
    const now = new Date();

    const result = await this.query<EmpireAifiPipeline>(
      `INSERT INTO empire_aifi_pipeline
       (id, idea_name, description, problem_statement, solution, market_size, tam_billions,
        score, status, source, assigned_to, criteria_scores, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id,
        input.idea_name,
        input.description || null,
        input.problem_statement || null,
        input.solution || null,
        input.market_size || null,
        input.tam_billions || null,
        input.score || null,
        'NEW',
        input.source || null,
        input.assigned_to || null,
        JSON.stringify(input.criteria_scores || {}),
        now,
        now,
      ]
    );

    return result.rows[0];
  }

  async getPipelineIdeas(): Promise<EmpireAifiPipeline[]> {
    const result = await this.query<EmpireAifiPipeline>(
      'SELECT * FROM empire_aifi_pipeline ORDER BY score DESC NULLS LAST, created_at DESC'
    );
    return result.rows;
  }

  async approvePipelineIdea(id: string, startupId: string): Promise<EmpireAifiPipeline | null> {
    const now = new Date();

    const result = await this.query<EmpireAifiPipeline>(
      `UPDATE empire_aifi_pipeline
       SET status = 'APPROVED', converted_to_startup_id = $1, updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [startupId, now, id]
    );

    return result.rows[0] || null;
  }

  // ============================================================================
  // Summary Operations
  // ============================================================================

  async getEmpireSummary(): Promise<EmpireSummary> {
    // Get startups and aggregate by status
    const startups = await this.listStartups();
    const byStatus: Record<string, number> = {};
    const byFounderStatus: Record<string, number> = {};

    for (const startup of startups) {
      byStatus[startup.status] = (byStatus[startup.status] || 0) + 1;
      byFounderStatus[startup.founder_status] = (byFounderStatus[startup.founder_status] || 0) + 1;
    }

    // Get latest financials
    const financialsResult = await this.query<{ total_mrr: number; total_arr: number; total_customers: number }>(
      `SELECT
         COALESCE(SUM(mrr_actual), 0) as total_mrr,
         COALESCE(SUM(arr_actual), 0) as total_arr,
         COALESCE(SUM(customers_total), 0) as total_customers
       FROM (
         SELECT DISTINCT ON (startup_id) mrr_actual, arr_actual, customers_total
         FROM empire_startup_financials
         ORDER BY startup_id, month DESC
       ) latest`
    );

    const financials = financialsResult.rows[0] || { total_mrr: 0, total_arr: 0, total_customers: 0 };

    // Get treasury status
    const treasury = await this.getTreasuryStatus();

    // Get recent activity
    const activityResult = await this.query<{ commits: number; prs: number; decisions: number }>(
      `SELECT
         (SELECT COUNT(*) FROM empire_github_commits WHERE committed_at >= NOW() - INTERVAL '7 days') as commits,
         (SELECT COUNT(*) FROM empire_github_pull_requests WHERE created_at >= NOW() - INTERVAL '7 days') as prs,
         (SELECT COUNT(*) FROM empire_decisions WHERE created_at >= NOW() - INTERVAL '7 days') as decisions`
    );

    const activity = activityResult.rows[0] || { commits: 0, prs: 0, decisions: 0 };

    return {
      totalStartups: startups.length,
      byStatus: byStatus as Record<any, number>,
      byFounderStatus: byFounderStatus as Record<any, number>,
      totalMRR: Number(financials.total_mrr),
      totalARR: Number(financials.total_arr),
      totalCustomers: Number(financials.total_customers),
      averageHealthScore: 75, // Would need to calculate per-startup
      recentActivity: {
        commitsLast7Days: Number(activity.commits),
        prsLast7Days: Number(activity.prs),
        decisionsLast7Days: Number(activity.decisions),
      },
      treasury,
    };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default DatabaseService;

/**
 * Empire Types
 * Database models for portfolio management, capital tracking, and strategic operations
 */

// ============================================================================
// Startup Status Enums
// ============================================================================

export type StartupStatus =
  | 'IDEA'        // Initial concept phase
  | 'CONCEPT'     // Validated concept
  | 'BUILDING'    // Active development
  | 'PRE-LAUNCH'  // Preparing for launch
  | 'LAUNCHED'    // Live and operating
  | 'SCALING'     // Growth phase
  | 'PROFITABLE'  // Generating profit
  | 'PAUSED'      // Temporarily paused
  | 'DEAD';       // Shut down

export type FounderStatus =
  | 'YOU'       // Founder-led by you
  | 'INTERNAL'  // Internal team member
  | 'EXTERNAL'  // External founder
  | 'HIRING'    // Actively hiring
  | 'NONE'      // No founder assigned
  | 'AI_CEO';   // MEGABRAIN is the CEO

export type FundingSource =
  | 'SELF'
  | 'TRDR'
  | 'EXTERNAL'
  | 'DEALS'
  | 'REVENUE';

// ============================================================================
// Portfolio Table
// ============================================================================

export interface EmpirePortfolio {
  id: string;                    // e.g., 'brnz', 'trdr', 'aifi'
  name: string;
  description?: string;
  status: StartupStatus;
  founder_status: FounderStatus;
  founder_name?: string;
  funding_source: FundingSource;
  github_repo?: string;
  website?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePortfolioInput {
  id: string;
  name: string;
  description?: string;
  status?: StartupStatus;
  founder_status?: FounderStatus;
  founder_name?: string;
  funding_source?: FundingSource;
  github_repo?: string;
  website?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Startup Financials Table
// ============================================================================

export interface EmpireStartupFinancials {
  id: string;
  startup_id: string;
  month: string;                 // Format: YYYY-MM
  mrr_actual: number;
  mrr_target: number;
  arr_actual: number;
  burn_rate: number;
  revenue_total: number;
  customers_total: number;
  customers_new: number;
  customers_churned: number;
  churn_rate: number;
  ltv: number;
  cac: number;
  ltv_cac_ratio: number;
  trdr_funding_received: number;
  notes?: string;
  created_at: Date;
}

export interface CreateFinancialsInput {
  startup_id: string;
  month: string;
  mrr_actual?: number;
  mrr_target?: number;
  arr_actual?: number;
  burn_rate?: number;
  revenue_total?: number;
  customers_total?: number;
  customers_new?: number;
  customers_churned?: number;
  churn_rate?: number;
  ltv?: number;
  cac?: number;
  ltv_cac_ratio?: number;
  trdr_funding_received?: number;
  notes?: string;
}

// ============================================================================
// Weekly Tasks Table
// ============================================================================

export type WeeklyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';

export interface WeeklyTaskItem {
  id: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface EmpireWeeklyTasks {
  id: string;
  startup_id: string;
  year: number;
  week_number: number;           // 1-53
  week_dates?: string;           // e.g., "Dec 16 - Dec 22"
  main_focus?: string;
  demos_target: number;
  demos_actual: number;
  followups_target: number;
  followups_actual: number;
  key_win_target?: string;
  key_win_achieved: boolean;
  tasks_json: WeeklyTaskItem[];
  notes?: string;
  status: WeeklyTaskStatus;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// 12-Month Plan Table
// ============================================================================

export type PlanStatus = 'PENDING' | 'ON_TRACK' | 'AT_RISK' | 'ACHIEVED' | 'MISSED';

export interface Empire12MonthPlan {
  id: string;
  startup_id: string;
  month: number;                 // 1-12
  year: number;
  milestone_title?: string;
  milestone_description?: string;
  target_mrr?: number;
  target_customers?: number;
  target_arr?: number;
  key_actions?: string;
  success_criteria?: string;
  status: PlanStatus;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// GitHub Repos Table
// ============================================================================

export type RepoType = 'MAIN' | 'FRONTEND' | 'BACKEND' | 'API' | 'MOBILE' | 'DOCS' | 'INFRA';

export interface EmpireGithubRepo {
  id: string;
  startup_id: string;
  repo_name: string;
  repo_url: string;
  owner?: string;
  repo_type: RepoType;
  default_branch: string;
  is_active: boolean;
  last_sync_at?: Date;
  created_at: Date;
}

// ============================================================================
// GitHub Commits Table
// ============================================================================

export interface EmpireGithubCommit {
  id: string;
  repo_id: string;
  startup_id: string;
  commit_sha: string;
  commit_message?: string;
  author?: string;
  author_email?: string;
  files_changed: number;
  additions: number;
  deletions: number;
  committed_at?: Date;
  created_at: Date;
}

// ============================================================================
// GitHub Pull Requests Table
// ============================================================================

export type PRState = 'OPEN' | 'CLOSED' | 'MERGED';

export interface EmpireGithubPR {
  id: string;
  repo_id: string;
  startup_id: string;
  pr_number: number;
  pr_title?: string;
  pr_description?: string;
  pr_state: PRState;
  author?: string;
  reviewers: string[];
  labels: string[];
  additions: number;
  deletions: number;
  files_changed: number;
  comments_count: number;
  created_at?: Date;
  merged_at?: Date;
  closed_at?: Date;
  updated_at: Date;
}

// ============================================================================
// GitHub Daily Summary Table
// ============================================================================

export interface EmpireGithubDailySummary {
  id: string;
  startup_id: string;
  date: Date;
  commits_count: number;
  prs_opened: number;
  prs_merged: number;
  prs_closed: number;
  total_additions: number;
  total_deletions: number;
  active_contributors: string[];
  activity_score: number;
  created_at: Date;
}

// ============================================================================
// TRDR Capital Table
// ============================================================================

export interface EmpireTrdrCapital {
  id: string;
  date: Date;
  total_capital: number;
  daily_pnl: number;
  monthly_pnl: number;
  monthly_pnl_percent: number;
  win_rate: number;
  active_positions: number;
  available_for_deployment: number;
  reserve_amount: number;
  deployed_to_startups: number;
  notes?: string;
  created_at: Date;
}

export interface TreasuryStatus {
  total_capital: number;
  daily_pnl: number;
  monthly_pnl: number;
  monthly_pnl_percent: number;
  win_rate: number;
  active_positions: number;
  available_for_deployment: number;
  reserve_amount: number;
  deployed_to_startups: number;
}

// ============================================================================
// Capital Allocations Table
// ============================================================================

export type AllocationType = 'INITIAL' | 'MONTHLY' | 'MILESTONE' | 'EMERGENCY';
export type AllocationStatus = 'PENDING' | 'APPROVED' | 'DISBURSED' | 'REJECTED';

export interface EmpireCapitalAllocation {
  id: string;
  startup_id: string;
  amount: number;
  allocation_type: AllocationType;
  purpose?: string;
  approved_by: string;
  status: AllocationStatus;
  created_at: Date;
  disbursed_at?: Date;
}

export interface CreateAllocationInput {
  startup_id: string;
  amount: number;
  allocation_type: AllocationType;
  purpose?: string;
  approved_by?: string;
}

// ============================================================================
// Weekly Orders Table
// ============================================================================

export interface OrderItem {
  type: string;
  description: string;
  startup_id?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AllocationItem {
  startup_id: string;
  amount: number;
  purpose: string;
}

export interface AlertItem {
  level: 'info' | 'warning' | 'critical';
  message: string;
  startup_id?: string;
}

export interface FounderStatusItem {
  startup_id: string;
  founder_status: FounderStatus;
  action_required?: string;
}

export interface EmpireWeeklyOrders {
  id: string;
  week_number: number;
  year: number;
  generated_at: Date;
  trdr_status_json: TreasuryStatus;
  portfolio_status_json: PortfolioStatusItem[];
  orders_json: OrderItem[];
  capital_allocation_json: AllocationItem[];
  alerts_json: AlertItem[];
  founder_status_json: FounderStatusItem[];
  next_decision_point?: Date;
  executed: boolean;
  executed_at?: Date;
  execution_notes?: string;
  full_report?: string;
}

export interface PortfolioStatusItem {
  startup_id: string;
  name: string;
  status: StartupStatus;
  health_score: number;
  key_metric: string;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Decisions Table
// ============================================================================

export type DecisionType =
  | 'CAPITAL_ALLOCATION'
  | 'STARTUP_STATUS_CHANGE'
  | 'FOUNDER_ASSIGNMENT'
  | 'KILL_STARTUP'
  | 'DOUBLE_DOWN'
  | 'PAUSE'
  | 'ALERT';

export interface EmpireDecision {
  id: string;
  decision_type: DecisionType;
  startup_id?: string;
  decision_summary: string;
  reasoning?: string;
  data_inputs_json: Record<string, unknown>;
  outcome?: string;
  created_at: Date;
}

export interface CreateDecisionInput {
  decision_type: DecisionType;
  startup_id?: string;
  decision_summary: string;
  reasoning?: string;
  data_inputs_json?: Record<string, unknown>;
  outcome?: string;
}

// ============================================================================
// AIFI Pipeline Table
// ============================================================================

export type PipelineStatus = 'NEW' | 'EVALUATING' | 'APPROVED' | 'REJECTED' | 'LAUNCHED';

export interface CriteriaScores {
  market_size?: number;      // 0-10
  competition?: number;      // 0-10
  technical_feasibility?: number;  // 0-10
  time_to_market?: number;   // 0-10
  revenue_potential?: number; // 0-10
  strategic_fit?: number;    // 0-10
}

export interface EmpireAifiPipeline {
  id: string;
  idea_name: string;
  description?: string;
  problem_statement?: string;
  solution?: string;
  market_size?: string;
  tam_billions?: number;      // Total Addressable Market in billions
  score?: number;             // 0-100
  status: PipelineStatus;
  source?: string;
  assigned_to?: string;
  evaluation_notes?: string;
  converted_to_startup_id?: string;
  criteria_scores: CriteriaScores;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePipelineInput {
  idea_name: string;
  description?: string;
  problem_statement?: string;
  solution?: string;
  market_size?: string;
  tam_billions?: number;
  score?: number;
  source?: string;
  assigned_to?: string;
  criteria_scores?: CriteriaScores;
}

// ============================================================================
// Empire Summary Types
// ============================================================================

export interface EmpireSummary {
  totalStartups: number;
  byStatus: Record<StartupStatus, number>;
  byFounderStatus: Record<FounderStatus, number>;
  totalMRR: number;
  totalARR: number;
  totalCustomers: number;
  averageHealthScore: number;
  recentActivity: {
    commitsLast7Days: number;
    prsLast7Days: number;
    decisionsLast7Days: number;
  };
  treasury: TreasuryStatus | null;
}

export interface StartupHealthScore {
  startup_id: string;
  name: string;
  score: number;           // 0-100
  factors: {
    mrrProgress: number;   // 0-30
    githubActivity: number; // 0-20
    founderStatus: number; // 0-15
    statusPenalty: number; // 0-20
    trend: number;         // -10 to +10
  };
  status: 'healthy' | 'at_risk' | 'critical';
  recommendations: string[];
}

// ============================================================================
// Weekly Orders Generation Types
// ============================================================================

export interface GenerateOrdersInput {
  forceRegenerate?: boolean;
}

export interface GenerateOrdersResult {
  weekNumber: number;
  year: number;
  ordersId: string;
  summary: string;
  orders: OrderItem[];
  allocations: AllocationItem[];
  alerts: AlertItem[];
}

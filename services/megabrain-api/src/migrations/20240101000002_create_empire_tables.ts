/**
 * Create Empire tables (13 tables)
 * Portfolio management, capital tracking, and strategic operations
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. empire_portfolio - Main startup registry
  await knex.schema.createTable('empire_portfolio', (table) => {
    table.string('id', 50).primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.string('status', 50).defaultTo('IDEA');
    table.string('founder_status', 50).defaultTo('NONE');
    table.string('founder_name', 100);
    table.string('funding_source', 50).defaultTo('SELF');
    table.string('github_repo', 255);
    table.string('website', 255);
    table.jsonb('tags').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('status');
    table.index('founder_status');
    table.index('funding_source');
  });

  // 2. empire_startup_financials - Monthly financial metrics
  await knex.schema.createTable('empire_startup_financials', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.string('month', 7).notNullable();
    table.decimal('mrr_actual', 14, 2).defaultTo(0);
    table.decimal('mrr_target', 14, 2).defaultTo(0);
    table.decimal('arr_actual', 14, 2).defaultTo(0);
    table.decimal('burn_rate', 14, 2).defaultTo(0);
    table.decimal('revenue_total', 14, 2).defaultTo(0);
    table.integer('customers_total').defaultTo(0);
    table.integer('customers_new').defaultTo(0);
    table.integer('customers_churned').defaultTo(0);
    table.decimal('churn_rate', 5, 2).defaultTo(0);
    table.decimal('ltv', 14, 2).defaultTo(0);
    table.decimal('cac', 14, 2).defaultTo(0);
    table.decimal('ltv_cac_ratio', 8, 2).defaultTo(0);
    table.decimal('trdr_funding_received', 14, 2).defaultTo(0);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['startup_id', 'month']);
    table.index('startup_id');
    table.index('month');
  });

  // 3. empire_weekly_tasks - Weekly sprint planning
  await knex.schema.createTable('empire_weekly_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.integer('year').notNullable();
    table.integer('week_number').notNullable();
    table.string('week_dates', 50);
    table.text('main_focus');
    table.integer('demos_target').defaultTo(0);
    table.integer('demos_actual').defaultTo(0);
    table.integer('followups_target').defaultTo(0);
    table.integer('followups_actual').defaultTo(0);
    table.text('key_win_target');
    table.boolean('key_win_achieved').defaultTo(false);
    table.jsonb('tasks_json').defaultTo('[]');
    table.text('notes');
    table.string('status', 20).defaultTo('PENDING');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['startup_id', 'year', 'week_number']);
    table.index('startup_id');
    table.index(['year', 'week_number']);
  });

  // 4. empire_12month_plan - Annual milestone planning
  await knex.schema.createTable('empire_12month_plan', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.integer('month').notNullable();
    table.integer('year').notNullable();
    table.string('milestone_title', 200);
    table.text('milestone_description');
    table.decimal('target_mrr', 14, 2);
    table.integer('target_customers');
    table.decimal('target_arr', 14, 2);
    table.text('key_actions');
    table.text('success_criteria');
    table.string('status', 20).defaultTo('PENDING');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['startup_id', 'month', 'year']);
    table.index('startup_id');
    table.index(['year', 'month']);
  });

  // 5. empire_github_repos - GitHub repository tracking
  await knex.schema.createTable('empire_github_repos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.string('repo_name', 200).notNullable();
    table.string('repo_url', 500).notNullable();
    table.string('owner', 100);
    table.string('repo_type', 20).defaultTo('MAIN');
    table.string('default_branch', 50).defaultTo('main');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_sync_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['startup_id', 'repo_url']);
    table.index('startup_id');
  });

  // 6. empire_github_commits - Commit history tracking
  await knex.schema.createTable('empire_github_commits', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('repo_id').references('id').inTable('empire_github_repos').onDelete('CASCADE');
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.string('commit_sha', 40).notNullable().unique();
    table.text('commit_message');
    table.string('author', 200);
    table.string('author_email', 200);
    table.integer('files_changed').defaultTo(0);
    table.integer('additions').defaultTo(0);
    table.integer('deletions').defaultTo(0);
    table.timestamp('committed_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('repo_id');
    table.index('startup_id');
    table.index('committed_at');
  });

  // 7. empire_github_pull_requests - Pull request tracking
  await knex.schema.createTable('empire_github_pull_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('repo_id').references('id').inTable('empire_github_repos').onDelete('CASCADE');
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.integer('pr_number').notNullable();
    table.string('pr_title', 500);
    table.text('pr_description');
    table.string('pr_state', 20);
    table.string('author', 200);
    table.jsonb('reviewers').defaultTo('[]');
    table.jsonb('labels').defaultTo('[]');
    table.integer('additions').defaultTo(0);
    table.integer('deletions').defaultTo(0);
    table.integer('files_changed').defaultTo(0);
    table.integer('comments_count').defaultTo(0);
    table.timestamp('created_at');
    table.timestamp('merged_at');
    table.timestamp('closed_at');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['repo_id', 'pr_number']);
    table.index('repo_id');
    table.index('startup_id');
    table.index('pr_state');
  });

  // 8. empire_github_daily_summary - Daily GitHub activity aggregation
  await knex.schema.createTable('empire_github_daily_summary', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('commits_count').defaultTo(0);
    table.integer('prs_opened').defaultTo(0);
    table.integer('prs_merged').defaultTo(0);
    table.integer('prs_closed').defaultTo(0);
    table.integer('total_additions').defaultTo(0);
    table.integer('total_deletions').defaultTo(0);
    table.jsonb('active_contributors').defaultTo('[]');
    table.integer('activity_score').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['startup_id', 'date']);
    table.index('startup_id');
    table.index('date');
  });

  // 9. empire_trdr_capital - TRDR trading capital tracking
  await knex.schema.createTable('empire_trdr_capital', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.date('date').notNullable().unique();
    table.decimal('total_capital', 16, 2);
    table.decimal('daily_pnl', 14, 2);
    table.decimal('monthly_pnl', 14, 2);
    table.decimal('monthly_pnl_percent', 6, 2);
    table.decimal('win_rate', 5, 2);
    table.integer('active_positions');
    table.decimal('available_for_deployment', 14, 2);
    table.decimal('reserve_amount', 14, 2);
    table.decimal('deployed_to_startups', 14, 2).defaultTo(0);
    table.text('notes');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('date');
  });

  // 10. empire_capital_allocations - Capital allocation tracking
  await knex.schema.createTable('empire_capital_allocations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('CASCADE');
    table.decimal('amount', 14, 2).notNullable();
    table.string('allocation_type', 20);
    table.string('purpose', 500);
    table.string('approved_by', 100).defaultTo('MEGABRAIN');
    table.string('status', 20).defaultTo('PENDING');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('disbursed_at');

    table.index('startup_id');
    table.index('status');
    table.index('created_at');
  });

  // 11. empire_weekly_orders - MEGABRAIN's weekly strategic orders
  await knex.schema.createTable('empire_weekly_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.integer('week_number').notNullable();
    table.integer('year').notNullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.jsonb('trdr_status_json').defaultTo('{}');
    table.jsonb('portfolio_status_json').defaultTo('[]');
    table.jsonb('orders_json').defaultTo('[]');
    table.jsonb('capital_allocation_json').defaultTo('[]');
    table.jsonb('alerts_json').defaultTo('[]');
    table.jsonb('founder_status_json').defaultTo('[]');
    table.date('next_decision_point');
    table.boolean('executed').defaultTo(false);
    table.timestamp('executed_at');
    table.text('execution_notes');
    table.text('full_report');

    table.unique(['week_number', 'year']);
    table.index(['year', 'week_number']);
    table.index('executed');
  });

  // 12. empire_decisions - Decision logging and audit trail
  await knex.schema.createTable('empire_decisions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('decision_type', 50);
    table.string('startup_id', 50).references('id').inTable('empire_portfolio').onDelete('SET NULL');
    table.string('decision_summary', 500);
    table.text('reasoning');
    table.jsonb('data_inputs_json').defaultTo('{}');
    table.string('outcome', 200);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('decision_type');
    table.index('startup_id');
    table.index('created_at');
  });

  // 13. empire_aifi_pipeline - Startup idea pipeline
  await knex.schema.createTable('empire_aifi_pipeline', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('idea_name', 200).notNullable();
    table.text('description');
    table.text('problem_statement');
    table.text('solution');
    table.string('market_size', 100);
    table.decimal('tam_billions', 10, 2);
    table.integer('score');
    table.string('status', 20).defaultTo('NEW');
    table.string('source', 200);
    table.string('assigned_to', 100);
    table.text('evaluation_notes');
    table.string('converted_to_startup_id', 50).references('id').inTable('empire_portfolio').onDelete('SET NULL');
    table.jsonb('criteria_scores').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('status');
    table.index('score');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('empire_aifi_pipeline');
  await knex.schema.dropTableIfExists('empire_decisions');
  await knex.schema.dropTableIfExists('empire_weekly_orders');
  await knex.schema.dropTableIfExists('empire_capital_allocations');
  await knex.schema.dropTableIfExists('empire_trdr_capital');
  await knex.schema.dropTableIfExists('empire_github_daily_summary');
  await knex.schema.dropTableIfExists('empire_github_pull_requests');
  await knex.schema.dropTableIfExists('empire_github_commits');
  await knex.schema.dropTableIfExists('empire_github_repos');
  await knex.schema.dropTableIfExists('empire_12month_plan');
  await knex.schema.dropTableIfExists('empire_weekly_tasks');
  await knex.schema.dropTableIfExists('empire_startup_financials');
  await knex.schema.dropTableIfExists('empire_portfolio');
}

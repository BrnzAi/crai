/**
 * Create MEGABRAIN core tables
 * - megabrain_workspaces
 * - megabrain_conversations
 * - megabrain_messages
 * - megabrain_documents
 * - megabrain_tasks
 * - megabrain_vectors
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Workspaces
  await knex.schema.createTable('megabrain_workspaces', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 200).notNullable();
    table.text('description');
    table.string('type', 50).defaultTo('startup');
    table.string('status', 50).defaultTo('active');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('type');
    table.index('status');
    table.index('created_at');
  });

  // Conversations
  await knex.schema.createTable('megabrain_conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('megabrain_workspaces').onDelete('CASCADE');
    table.string('title', 500);
    table.integer('message_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('workspace_id');
    table.index('updated_at');
  });

  // Messages
  await knex.schema.createTable('megabrain_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('megabrain_conversations').onDelete('CASCADE');
    table.string('role', 50).notNullable();
    table.text('content').notNullable();
    table.string('agent_type', 50);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('conversation_id');
    table.index('created_at');
  });

  // Documents
  await knex.schema.createTable('megabrain_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('megabrain_workspaces').onDelete('CASCADE');
    table.string('title', 500).notNullable();
    table.text('content').notNullable();
    table.string('type', 50).defaultTo('note');
    table.integer('version').defaultTo(1);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('workspace_id');
    table.index('type');
    table.index('updated_at');
  });

  // Tasks
  await knex.schema.createTable('megabrain_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('megabrain_workspaces').onDelete('CASCADE');
    table.string('title', 500).notNullable();
    table.text('description');
    table.string('status', 50).defaultTo('pending');
    table.string('priority', 50).defaultTo('medium');
    table.string('assigned_agent', 50);
    table.jsonb('dependencies').defaultTo('[]');
    table.jsonb('result');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');

    table.index('workspace_id');
    table.index('status');
    table.index('created_at');
  });

  // Vectors
  await knex.schema.createTable('megabrain_vectors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('workspace_id').notNullable().references('id').inTable('megabrain_workspaces').onDelete('CASCADE');
    table.text('content').notNullable();
    table.jsonb('embedding').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('workspace_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('megabrain_vectors');
  await knex.schema.dropTableIfExists('megabrain_tasks');
  await knex.schema.dropTableIfExists('megabrain_documents');
  await knex.schema.dropTableIfExists('megabrain_messages');
  await knex.schema.dropTableIfExists('megabrain_conversations');
  await knex.schema.dropTableIfExists('megabrain_workspaces');
}

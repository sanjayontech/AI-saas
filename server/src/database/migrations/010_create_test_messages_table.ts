import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('test_messages', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id', 36).primary();
      table.string('session_id', 36).notNullable().references('id').inTable('test_sessions').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('session_id').notNullable().references('id').inTable('test_sessions').onDelete('CASCADE');
    }
    
    table.enum('role', ['user', 'assistant']).notNullable();
    table.text('content').notNullable();
    
    if (knex.client.config.client === 'sqlite3') {
      table.text('debug_info').nullable();
    } else {
      table.json('debug_info').nullable();
    }
    
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(['session_id']);
    table.index(['timestamp']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('test_messages');
}
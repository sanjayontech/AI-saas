import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('test_sessions', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id', 36).primary();
      table.string('chatbot_id', 36).notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
      table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    }
    
    table.boolean('debug_mode').defaultTo(false);
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['chatbot_id']);
    table.index(['expires_at']);
    table.index(['last_activity']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('test_sessions');
}
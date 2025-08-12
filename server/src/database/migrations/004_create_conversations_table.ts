import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('conversations', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id', 36).primary();
      table.string('chatbot_id', 36).notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
    }
    
    table.string('session_id').notNullable();
    
    if (knex.client.config.client === 'sqlite3') {
      table.text('user_info').nullable();
    } else {
      table.json('user_info').nullable();
    }
    
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at').nullable();
    table.timestamps(true, true);
    
    table.index(['chatbot_id']);
    table.index(['session_id']);
    table.index(['started_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('conversations');
}
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('messages', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id', 36).primary();
      table.string('conversation_id', 36).notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    }
    
    table.enum('role', ['user', 'assistant']).notNullable();
    table.text('content').notNullable();
    
    if (knex.client.config.client === 'sqlite3') {
      table.text('metadata').nullable();
    } else {
      table.json('metadata').nullable();
    }
    
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(['conversation_id']);
    table.index(['timestamp']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('messages');
}
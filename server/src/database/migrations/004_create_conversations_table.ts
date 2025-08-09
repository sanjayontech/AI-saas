import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
    table.string('session_id').notNullable();
    table.json('user_info').nullable();
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
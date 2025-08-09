import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('total_conversations').defaultTo(0);
    table.integer('total_messages').defaultTo(0);
    table.integer('unique_users').defaultTo(0);
    table.decimal('avg_conversation_length', 8, 2).defaultTo(0);
    table.decimal('user_satisfaction', 3, 2).nullable();
    table.json('popular_queries').defaultTo('[]');
    table.timestamps(true, true);
    
    table.index(['chatbot_id']);
    table.index(['date']);
    table.unique(['chatbot_id', 'date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('analytics');
}
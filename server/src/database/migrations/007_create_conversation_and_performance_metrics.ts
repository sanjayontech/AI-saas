import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return Promise.all([
    // Update analytics table to match our model
    knex.schema.alterTable('analytics', (table) => {
      table.decimal('avg_response_time', 8, 2).defaultTo(0);
      table.integer('user_satisfaction_score').defaultTo(0);
      table.integer('total_ratings').defaultTo(0);
      table.text('response_categories').nullable();
      table.dropColumn('user_satisfaction');
    }),

    // Conversation metrics table for detailed conversation tracking
    knex.schema.createTable('conversation_metrics', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
      table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
      table.integer('message_count').defaultTo(0);
      table.decimal('duration_seconds', 10, 2).nullable();
      table.decimal('avg_response_time', 8, 2).nullable();
      table.integer('user_satisfaction').nullable();
      table.string('user_intent').nullable();
      table.boolean('goal_achieved').nullable();
      table.text('sentiment_analysis').nullable();
      table.text('topics_discussed').nullable();
      table.timestamps(true, true);
      
      table.index('conversation_id');
      table.index('chatbot_id');
      table.index('user_satisfaction');
      table.unique('conversation_id');
    }),

    // Performance metrics table for system performance tracking
    knex.schema.createTable('performance_metrics', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
      table.timestamp('timestamp').notNullable();
      table.decimal('response_time', 8, 2).notNullable();
      table.integer('token_usage').defaultTo(0);
      table.string('model_version').nullable();
      table.string('endpoint').nullable();
      table.integer('status_code').defaultTo(200);
      table.text('error_message').nullable();
      table.text('metadata').nullable();
      table.timestamps(true, true);
      
      table.index(['chatbot_id', 'timestamp']);
      table.index('timestamp');
      table.index('status_code');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return Promise.all([
    knex.schema.dropTableIfExists('performance_metrics'),
    knex.schema.dropTableIfExists('conversation_metrics'),
    knex.schema.alterTable('analytics', (table) => {
      table.dropColumn('avg_response_time');
      table.dropColumn('user_satisfaction_score');
      table.dropColumn('total_ratings');
      table.dropColumn('response_categories');
      table.decimal('user_satisfaction', 3, 2).nullable();
    })
  ]);
}
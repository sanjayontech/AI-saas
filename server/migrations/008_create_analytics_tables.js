/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Analytics table for storing aggregated metrics
    knex.schema.createTable('analytics', function(table) {
      table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
      table.string('chatbot_id', 36).notNullable();
      table.date('date').notNullable(); // Date for daily aggregation
      table.integer('total_conversations').defaultTo(0);
      table.integer('total_messages').defaultTo(0);
      table.integer('unique_users').defaultTo(0);
      table.decimal('avg_conversation_length', 8, 2).defaultTo(0); // Average messages per conversation
      table.decimal('avg_response_time', 8, 2).defaultTo(0); // Average response time in seconds
      table.integer('user_satisfaction_score').defaultTo(0); // 1-5 rating
      table.integer('total_ratings').defaultTo(0);
      table.text('popular_queries').nullable(); // JSON string of most common user queries
      table.text('response_categories').nullable(); // JSON string of categorized response types
      table.timestamps(true, true);
      
      // Indexes
      table.index(['chatbot_id', 'date']);
      table.index('date');
      
      // Foreign key
      table.foreign('chatbot_id').references('id').inTable('chatbots').onDelete('CASCADE');
      
      // Unique constraint to prevent duplicate daily records
      table.unique(['chatbot_id', 'date']);
    }),

    // Conversation metrics table for detailed conversation tracking
    knex.schema.createTable('conversation_metrics', function(table) {
      table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
      table.string('conversation_id', 36).notNullable();
      table.string('chatbot_id', 36).notNullable();
      table.integer('message_count').defaultTo(0);
      table.decimal('duration_seconds', 10, 2).nullable(); // Conversation duration
      table.decimal('avg_response_time', 8, 2).nullable(); // Average AI response time
      table.integer('user_satisfaction').nullable(); // 1-5 rating if provided
      table.string('user_intent').nullable(); // Detected user intent/category
      table.boolean('goal_achieved').nullable(); // Whether conversation achieved its goal
      table.text('sentiment_analysis').nullable(); // JSON string of sentiment scores
      table.text('topics_discussed').nullable(); // JSON string of topics/categories
      table.timestamps(true, true);
      
      // Indexes
      table.index('conversation_id');
      table.index('chatbot_id');
      table.index('user_satisfaction');
      
      // Foreign keys
      table.foreign('conversation_id').references('id').inTable('conversations').onDelete('CASCADE');
      table.foreign('chatbot_id').references('id').inTable('chatbots').onDelete('CASCADE');
      
      // Unique constraint
      table.unique('conversation_id');
    }),

    // Performance metrics table for system performance tracking
    knex.schema.createTable('performance_metrics', function(table) {
      table.string('id', 36).primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
      table.string('chatbot_id', 36).notNullable();
      table.timestamp('timestamp').notNullable();
      table.decimal('response_time', 8, 2).notNullable(); // AI response time in seconds
      table.integer('token_usage').defaultTo(0); // Tokens used for this request
      table.string('model_version').nullable(); // AI model version used
      table.string('endpoint').nullable(); // API endpoint called
      table.integer('status_code').defaultTo(200); // HTTP status code
      table.text('error_message').nullable(); // Error message if any
      table.text('metadata').nullable(); // JSON string of additional performance data
      table.timestamps(true, true);
      
      // Indexes
      table.index(['chatbot_id', 'timestamp']);
      table.index('timestamp');
      table.index('status_code');
      
      // Foreign key
      table.foreign('chatbot_id').references('id').inTable('chatbots').onDelete('CASCADE');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('performance_metrics'),
    knex.schema.dropTableIfExists('conversation_metrics'),
    knex.schema.dropTableIfExists('analytics')
  ]);
};
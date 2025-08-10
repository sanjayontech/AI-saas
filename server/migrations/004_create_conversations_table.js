exports.up = function(knex) {
  return knex.schema.createTable('conversations', (table) => {
    table.string('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('chatbot_id').notNullable().references('id').inTable('chatbots').onDelete('CASCADE');
    table.string('session_id').notNullable();
    table.text('user_info').nullable();
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('ended_at').nullable();
    table.timestamps(true, true);
    
    table.index(['chatbot_id']);
    table.index(['session_id']);
    table.index(['started_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('conversations');
};
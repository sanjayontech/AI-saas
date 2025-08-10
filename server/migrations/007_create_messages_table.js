exports.up = function(knex) {
  return knex.schema.createTable('messages', (table) => {
    table.string('id').primary().defaultTo(knex.raw('(lower(hex(randomblob(4))) || \'-\' || lower(hex(randomblob(2))) || \'-4\' || substr(lower(hex(randomblob(2))),2) || \'-\' || substr(\'89ab\',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || \'-\' || lower(hex(randomblob(6))))'));
    table.string('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.string('role').notNullable().checkIn(['user', 'assistant']);
    table.text('content').notNullable();
    table.text('metadata').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.index(['conversation_id']);
    table.index(['timestamp']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('messages');
};
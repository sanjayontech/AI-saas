exports.up = function(knex) {
  return knex.schema.createTable('user_profiles', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    }
    table.json('preferences').defaultTo('{}');
    table.timestamps(true, true);
    
    table.index(['user_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('user_profiles');
};
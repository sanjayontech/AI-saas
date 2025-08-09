exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    }
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token').nullable();
    table.string('password_reset_token').nullable();
    table.timestamp('password_reset_expires').nullable();
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['email_verification_token']);
    table.index(['password_reset_token']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
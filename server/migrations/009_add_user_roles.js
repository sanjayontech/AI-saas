exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.enum('role', ['user', 'admin']).defaultTo('user').notNullable();
    table.timestamp('last_login_at').nullable();
    table.index(['role']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('role');
    table.dropColumn('last_login_at');
  });
};
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.enum('role', ['user', 'admin']).defaultTo('user').notNullable();
    table.timestamp('last_login_at').nullable();
    table.index(['role']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('role');
    table.dropColumn('last_login_at');
  });
}
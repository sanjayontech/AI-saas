import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('usage_stats', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id').primary().defaultTo(knex.raw("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"));
      table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    }
    table.integer('messages_this_month').defaultTo(0);
    table.integer('total_messages').defaultTo(0);
    table.integer('chatbots_created').defaultTo(0);
    table.bigInteger('storage_used').defaultTo(0); // in bytes
    table.timestamp('last_active').nullable();
    table.timestamps(true, true);
    
    table.unique(['user_id']);
    table.index(['user_id']);
    table.index(['last_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('usage_stats');
}
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('chatbots', (table) => {
    if (knex.client.config.client === 'sqlite3') {
      table.string('id', 36).primary();
    } else {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    }
    
    if (knex.client.config.client === 'sqlite3') {
      table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    } else {
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    }
    
    table.string('name').notNullable();
    table.text('description').nullable();
    table.text('personality').defaultTo('helpful and friendly');
    
    if (knex.client.config.client === 'sqlite3') {
      table.text('knowledge_base').defaultTo('[]');
      table.text('appearance').defaultTo('{}');
      table.text('settings').defaultTo('{}');
    } else {
      table.json('knowledge_base').defaultTo('[]');
      table.json('appearance').defaultTo('{}');
      table.json('settings').defaultTo('{}');
    }
    
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('chatbots');
}
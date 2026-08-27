import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const skulls = pgTable('skulls', {
  id: text('id').primaryKey(),
  guildId: text('guild_id').notNull(),
  userId: text('user_id').notNull(),
  username: text('username').notNull(),
  count: integer('count').notNull().default(0),
});

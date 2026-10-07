import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const content = sqliteTable('content', { id: text('id').primaryKey(), kind: text('kind').notNull(), title: text('title').notNull(), body: text('body').notNull(), image: text('image'), published: integer('published').notNull().default(0), created: text('created').notNull() });
export const settings = sqliteTable('settings', { id: text('id').primaryKey(), value: text('value').notNull() });
export const chatLimits=sqliteTable('chat_limits',{id:text('id').primaryKey(),count:integer('count').notNull().default(0),window:integer('window').notNull()});

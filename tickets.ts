import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketPanelsTable = sqliteTable("ticket_panels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  title: text("title").notNull().default("Support Tickets"),
  description: text("description").notNull().default(
    "Select a category below to open a ticket.",
  ),
  color: text("color").notNull().default("#5865F2"),
  categories: text("categories", { mode: "json" })
    .$type<{ id: string; label: string; emoji: string; description: string }[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertTicketPanelSchema = createInsertSchema(
  ticketPanelsTable,
).omit({ id: true, createdAt: true });
export type InsertTicketPanel = z.infer<typeof insertTicketPanelSchema>;
export type TicketPanel = typeof ticketPanelsTable.$inferSelect;

export const ticketsTable = sqliteTable("tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  panelId: integer("panel_id"),
  categoryLabel: text("category_label"),
  channelId: text("channel_id").notNull().unique(),
  userId: text("user_id").notNull(),
  claimedBy: text("claimed_by"),
  status: text("status").notNull().default("open"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  closedBy: text("closed_by"),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  transcript: text("transcript"),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;

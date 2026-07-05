import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildConfigsTable = sqliteTable("guild_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull().unique(),
  staffRoleId: text("staff_role_id"),
  adminRoleId: text("admin_role_id"),
  sessionChannelId: text("session_channel_id"),
  sessionPingRoleId: text("session_ping_role_id"),
  promotionChannelId: text("promotion_channel_id"),
  infractionLogChannelId: text("infraction_log_channel_id"),
  staffInfractionLogChannelId: text("staff_infraction_log_channel_id"),
  ticketLogChannelId: text("ticket_log_channel_id"),
  ticketCategoryId: text("ticket_category_id"),
  embedColor: text("embed_color").notNull().default("#5865F2"),
  dashboardTitle: text("dashboard_title"),
  dashboardDescription: text("dashboard_description"),
  dashboardThumbnail: text("dashboard_thumbnail"),
  dashboardImage: text("dashboard_image"),
  dashboardFooter: text("dashboard_footer"),
  dashboardFields: text("dashboard_fields", { mode: "json" })
    .$type<{ name: string; value: string; inline: boolean }[]>()
    .notNull()
    .default([]),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const insertGuildConfigSchema = createInsertSchema(
  guildConfigsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;
export type GuildConfig = typeof guildConfigsTable.$inferSelect;

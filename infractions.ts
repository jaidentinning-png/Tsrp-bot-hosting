import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const infractionsTable = sqliteTable("infractions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  moderatorId: text("moderator_id").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertInfractionSchema = createInsertSchema(
  infractionsTable,
).omit({ id: true, createdAt: true, active: true });
export type InsertInfraction = z.infer<typeof insertInfractionSchema>;
export type Infraction = typeof infractionsTable.$inferSelect;

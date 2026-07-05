import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const STAFF_INFRACTION_TYPES = [
  "verbal_warning",
  "strike",
  "suspension",
  "demotion",
  "termination",
  "blacklist",
] as const;

export type StaffInfractionType = (typeof STAFF_INFRACTION_TYPES)[number];

export const STAFF_INFRACTION_LABELS: Record<StaffInfractionType, string> = {
  verbal_warning: "Verbal Warning",
  strike: "Strike",
  suspension: "Suspension",
  demotion: "Demotion",
  termination: "Termination",
  blacklist: "Blacklist",
};

export const staffInfractionsTable = sqliteTable("staff_infractions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  staffUserId: text("staff_user_id").notNull(),
  issuerId: text("issuer_id").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertStaffInfractionSchema = createInsertSchema(
  staffInfractionsTable,
).omit({ id: true, createdAt: true, active: true });
export type InsertStaffInfraction = z.infer<typeof insertStaffInfractionSchema>;
export type StaffInfraction = typeof staffInfractionsTable.$inferSelect;

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customEmbedsTable = sqliteTable("custom_embeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guildId: text("guild_id").notNull(),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  color: text("color").notNull().default("#5865F2"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  footer: text("footer"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertCustomEmbedSchema = createInsertSchema(
  customEmbedsTable,
).omit({ id: true, createdAt: true });
export type InsertCustomEmbed = z.infer<typeof insertCustomEmbedSchema>;
export type CustomEmbed = typeof customEmbedsTable.$inferSelect;

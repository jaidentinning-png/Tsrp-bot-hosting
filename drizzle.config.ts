import { defineConfig } from "drizzle-kit";
import path from "path";

const sqlitePath = process.env.SQLITE_PATH || "./data/tsrp-bot.db";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: path.resolve(sqlitePath),
  },
});

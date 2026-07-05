# TSRP Bot — Self-Host Package (npm, no workspace tooling)

A Discord bot for ERLC roleplay servers: sessions, promotions, moderation
(warn/kick/ban/timeout/unban/untimeout), a separate staff infraction system
(`/infract`), a ticket system, custom embeds, an emblem maker, and a
dashboard embed.

This is a plain single-package Node.js project — no pnpm, no workspaces,
no external database server. It uses a local SQLite file, so it will run
on any host that supports `npm install` + `npm start` (Render, Railway,
a plain VPS, etc.).

## Requirements

- Node.js 20+

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values (most hosts let you set
these in a dashboard instead of a `.env` file — check your platform's docs):

- `DISCORD_BOT_TOKEN` — Discord Developer Portal → your app → **Bot** tab →
  Reset Token. Copy immediately, it's only shown once.
- `DISCORD_CLIENT_ID` — your application ID, from **General Information**.
- `DISCORD_GUILD_ID` — the Discord server ID to deploy commands to (enable
  Developer Mode in Discord, then right-click your server icon → Copy Server ID).
- `SESSION_SECRET` — any long random string (e.g. `openssl rand -hex 32`).
- `PORT` — required, the port your host expects the app to listen on.
- `SQLITE_PATH` (optional) — where the SQLite database file lives. Defaults
  to `./data/tsrp-bot.db`. On hosts with ephemeral disks, point this at a
  persistent volume/mount if one is provided.

## 3. Create the database

```bash
npm run db:push
```

## 4. Build and run

```bash
npm run build
npm start
```

The bot logs in, deploys its slash commands to the configured guild, and the
server starts listening on `PORT`.

## Deploying on a "just run my app" style host

Most of these platforms (Render, Railway, Fly.io, etc.) just need:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Environment variables set in their dashboard (see above)
- If the host wipes the filesystem between deploys, attach a persistent disk
  and point `SQLITE_PATH` at a file inside it — otherwise your data resets
  on every redeploy.

## Running it 24/7 on your own VM

```bash
pm2 start "npm start" --name tsrp-bot
pm2 save
pm2 startup
```

## Updating the database schema later

If you change any file under `src/db/schema/`, re-run:

```bash
npm run db:push
```

## Project layout

```
src/
  index.ts        Entry point: starts the API server + Discord bot
  app.ts           Express app setup
  bot/             Discord bot: commands, events, embeds, tickets, emblem maker
  db/              Database schema and client (SQLite via @libsql/client)
  zod/             Shared Zod validation types
  routes/          HTTP routes (health check)
  lib/             Logger setup
```

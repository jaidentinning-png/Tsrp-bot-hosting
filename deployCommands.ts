import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import { logger } from "../lib/logger";

export async function deployCommands(): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  const guildId = process.env["DISCORD_GUILD_ID"];

  if (!token || !clientId) {
    throw new Error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required to deploy commands.");
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const body = commands.map((c) => c.data.toJSON());

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    logger.info({ count: body.length, guildId }, "Deployed guild slash commands");
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    logger.info({ count: body.length }, "Deployed global slash commands");
  }
}

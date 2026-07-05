import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { SlashCommand } from "./types";

export interface BotClient extends Client {
  commands: Collection<string, SlashCommand>;
}

export function createBotClient(): BotClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
    ],
    partials: [Partials.Channel],
  }) as BotClient;

  client.commands = new Collection();

  return client;
}

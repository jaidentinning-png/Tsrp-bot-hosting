import type { Interaction } from "discord.js";
import { db, ticketPanelsTable } from "../db/index.js";
import { eq } from "drizzle-orm";
import type { BotClient } from "./client";
import { claimTicket, openTicket } from "./tickets";
import { logger } from "../lib/logger";

export async function handleInteraction(client: BotClient, interaction: Interaction): Promise<void> {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Slash command failed");
      const payload = { content: "Something went wrong running that command.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    const [action, ...rest] = interaction.customId.split(":");
    if (!interaction.guild) return;

    try {
      if (action === "ticket_open") {
        const [panelIdRaw, categoryId] = rest;
        const panelId = Number(panelIdRaw);
        await interaction.deferReply({ ephemeral: true });
        const [panel] = await db.select().from(ticketPanelsTable).where(eq(ticketPanelsTable.id, panelId)).limit(1);
        if (!panel) {
          await interaction.editReply({ content: "This panel is no longer valid." });
          return;
        }
        const result = await openTicket(interaction.guild, interaction.user, panel, categoryId ?? "");
        await interaction.editReply({ content: result.message });
        return;
      }

      if (action === "ticket_claim") {
        const ticketId = Number(rest[0]);
        const ticket = await claimTicket(interaction, ticketId);
        await interaction.reply({
          content: ticket ? `<@${interaction.user.id}> claimed this ticket.` : "Could not claim this ticket.",
        });
        return;
      }

      if (action === "ticket_close") {
        const command = interaction.client.application?.commands.cache.find((c) => c.name === "ticket");
        await interaction.reply({
          content: command
            ? `Use </ticket close:${command.id}> to close this ticket.`
            : "Use `/ticket close` to close this ticket.",
          ephemeral: true,
        });
      }
    } catch (err) {
      logger.error({ err, customId: interaction.customId }, "Button interaction failed");
    }
  }
}

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { db, ticketsTable } from "../../db/index.js";
import { and, desc, eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { baseEmbed } from "../utils";
import { getGuildConfig } from "../config";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ticketlog")
    .setDescription("View closed ticket logs")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("recent")
        .setDescription("Show the most recently closed tickets")
        .addIntegerOption((opt) => opt.setName("count").setDescription("How many to show (max 15)").setMinValue(1).setMaxValue(15)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View the transcript of a specific ticket")
        .addIntegerOption((opt) => opt.setName("id").setDescription("Ticket ID").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Show ticket history for a user")
        .addUserOption((opt) => opt.setName("user").setDescription("User to check").setRequired(true)),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "recent") {
      const count = interaction.options.getInteger("count") ?? 10;
      const tickets = await db
        .select()
        .from(ticketsTable)
        .where(and(eq(ticketsTable.guildId, interaction.guild.id), eq(ticketsTable.status, "closed")))
        .orderBy(desc(ticketsTable.closedAt))
        .limit(count);

      if (tickets.length === 0) {
        await interaction.reply({ content: "No closed tickets yet.", ephemeral: true });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle("Recent Closed Tickets")
        .setDescription(
          tickets
            .map((t) => `**#${t.id}** — ${t.categoryLabel ?? "General"} — opened by <@${t.userId}>, closed by <@${t.closedBy}>`)
            .join("\n"),
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "view") {
      const id = interaction.options.getInteger("id", true);
      const [ticket] = await db
        .select()
        .from(ticketsTable)
        .where(and(eq(ticketsTable.id, id), eq(ticketsTable.guildId, interaction.guild.id)))
        .limit(1);

      if (!ticket) {
        await interaction.reply({ content: `No ticket found with ID #${id}.`, ephemeral: true });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle(`Ticket #${ticket.id} Transcript`)
        .addFields(
          { name: "Opened By", value: `<@${ticket.userId}>`, inline: true },
          { name: "Status", value: ticket.status, inline: true },
        )
        .setDescription(ticket.transcript?.slice(0, 3900) ?? "No transcript recorded.");

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "user") {
      const user = interaction.options.getUser("user", true);
      const tickets = await db
        .select()
        .from(ticketsTable)
        .where(and(eq(ticketsTable.guildId, interaction.guild.id), eq(ticketsTable.userId, user.id)))
        .orderBy(desc(ticketsTable.createdAt))
        .limit(15);

      if (tickets.length === 0) {
        await interaction.reply({ content: `${user.username} has no ticket history.`, ephemeral: true });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle(`Ticket History — ${user.username}`)
        .setDescription(tickets.map((t) => `**#${t.id}** — ${t.categoryLabel ?? "General"} — ${t.status}`).join("\n"));

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default command;

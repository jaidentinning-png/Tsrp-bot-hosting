import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { db, sessionsTable } from "../../db/index.js";
import { and, desc, eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { getGuildConfig } from "../config";
import { baseEmbed } from "../utils";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("session")
    .setDescription("Manage roleplay sessions")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Announce a session start")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Where to announce (defaults to configured session channel)")
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((opt) =>
          opt.setName("info").setDescription("Extra info, e.g. join link or server code"),
        ),
    )
    .addSubcommand((sub) => sub.setName("end").setDescription("End the active session"))
    .addSubcommand((sub) => sub.setName("status").setDescription("Show active session status")),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "start") {
      const [existing] = await db
        .select()
        .from(sessionsTable)
        .where(and(eq(sessionsTable.guildId, interaction.guild.id), eq(sessionsTable.status, "active")))
        .limit(1);
      if (existing) {
        await interaction.reply({ content: "There is already an active session. End it first with `/session end`.", ephemeral: true });
        return;
      }

      const targetChannel =
        interaction.options.getChannel("channel") ??
        (config.sessionChannelId
          ? await interaction.guild.channels.fetch(config.sessionChannelId).catch(() => null)
          : null);

      if (!targetChannel || !("send" in targetChannel) || !targetChannel.isTextBased()) {
        await interaction.reply({ content: "No session channel is configured. Provide one or set it with `/config set-channel`.", ephemeral: true });
        return;
      }

      const info = interaction.options.getString("info");
      const embed = baseEmbed(config.embedColor)
        .setTitle("🟢 Session Started")
        .setDescription(`A session has been started by <@${interaction.user.id}>.${info ? `\n\n${info}` : ""}`)
        .setTimestamp(new Date());

      const ping = config.sessionPingRoleId ? `<@&${config.sessionPingRoleId}>` : undefined;
      const message = await targetChannel.send({ content: ping, embeds: [embed] });

      await db.insert(sessionsTable).values({
        guildId: interaction.guild.id,
        hostId: interaction.user.id,
        channelId: targetChannel.id,
        messageId: message.id,
        status: "active",
      });

      await interaction.reply({ content: `Session started in <#${targetChannel.id}>.`, ephemeral: true });
      return;
    }

    if (sub === "end") {
      const [existing] = await db
        .select()
        .from(sessionsTable)
        .where(and(eq(sessionsTable.guildId, interaction.guild.id), eq(sessionsTable.status, "active")))
        .limit(1);

      if (!existing) {
        await interaction.reply({ content: "No active session to end.", ephemeral: true });
        return;
      }

      await db
        .update(sessionsTable)
        .set({ status: "ended", endedAt: new Date() })
        .where(eq(sessionsTable.id, existing.id));

      if (existing.channelId) {
        const channel = await interaction.guild.channels.fetch(existing.channelId).catch(() => null);
        if (channel?.isTextBased()) {
          const embed = baseEmbed(config.embedColor)
            .setTitle("🔴 Session Ended")
            .setDescription(`The session hosted by <@${existing.hostId}> has ended.`)
            .setTimestamp(new Date());
          await channel.send({ embeds: [embed] });
        }
      }

      await interaction.reply({ content: "Session ended.", ephemeral: true });
      return;
    }

    if (sub === "status") {
      const [existing] = await db
        .select()
        .from(sessionsTable)
        .where(and(eq(sessionsTable.guildId, interaction.guild.id), eq(sessionsTable.status, "active")))
        .orderBy(desc(sessionsTable.startedAt))
        .limit(1);

      if (!existing) {
        await interaction.reply({ content: "No active session.", ephemeral: true });
        return;
      }

      await interaction.reply({
        content: `Active session hosted by <@${existing.hostId}>, started <t:${Math.floor(existing.startedAt.getTime() / 1000)}:R>.`,
        ephemeral: true,
      });
    }
  },
};

export default command;

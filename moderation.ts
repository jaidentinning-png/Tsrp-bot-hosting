import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types";
import { getGuildConfig } from "../config";
import { logInfraction } from "../infractionLog";
import { baseEmbed } from "../utils";

const MS_PER_MINUTE = 60_000;

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Moderation actions: warn, kick, ban, timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("warn")
        .setDescription("Warn a user")
        .addUserOption((opt) => opt.setName("user").setDescription("User to warn").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Kick a user from the server")
        .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Ban a user from the server")
        .addUserOption((opt) => opt.setName("user").setDescription("User to ban").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("delete-days").setDescription("Days of messages to delete (0-7)").setMinValue(0).setMaxValue(7),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("unban")
        .setDescription("Unban a user by ID")
        .addStringOption((opt) => opt.setName("user-id").setDescription("User ID to unban").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timeout")
        .setDescription("Timeout (mute) a user")
        .addUserOption((opt) => opt.setName("user").setDescription("User to timeout").setRequired(true))
        .addIntegerOption((opt) =>
          opt.setName("minutes").setDescription("Timeout duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320),
        )
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("untimeout")
        .setDescription("Remove an active timeout from a user")
        .addUserOption((opt) => opt.setName("user").setDescription("User to remove timeout from").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason")),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "warn") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const id = await logInfraction(interaction.guild, target, interaction.user.id, "warn", reason);
      await target.send({ embeds: [baseEmbed(config.embedColor).setTitle("You have been warned").addFields({ name: "Server", value: interaction.guild.name }, { name: "Reason", value: reason })] }).catch(() => null);
      await interaction.reply({ content: `Warned <@${target.id}> (#${id}).`, ephemeral: true });
      return;
    }

    if (sub === "kick") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        return;
      }
      if (!member.kickable) {
        await interaction.reply({ content: "I can't kick that user (role hierarchy or missing permission).", ephemeral: true });
        return;
      }
      await target.send({ embeds: [baseEmbed(config.embedColor).setTitle("You have been kicked").addFields({ name: "Server", value: interaction.guild.name }, { name: "Reason", value: reason })] }).catch(() => null);
      await member.kick(reason);
      const id = await logInfraction(interaction.guild, target, interaction.user.id, "kick", reason);
      await interaction.reply({ content: `Kicked <@${target.id}> (#${id}).`, ephemeral: true });
      return;
    }

    if (sub === "ban") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const deleteDays = interaction.options.getInteger("delete-days") ?? 0;
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (member && !member.bannable) {
        await interaction.reply({ content: "I can't ban that user (role hierarchy or missing permission).", ephemeral: true });
        return;
      }
      await target.send({ embeds: [baseEmbed(config.embedColor).setTitle("You have been banned").addFields({ name: "Server", value: interaction.guild.name }, { name: "Reason", value: reason })] }).catch(() => null);
      await interaction.guild.members.ban(target.id, { deleteMessageSeconds: deleteDays * 86400, reason });
      const id = await logInfraction(interaction.guild, target, interaction.user.id, "ban", reason);
      await interaction.reply({ content: `Banned <@${target.id}> (#${id}).`, ephemeral: true });
      return;
    }

    if (sub === "unban") {
      const userId = interaction.options.getString("user-id", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      try {
        await interaction.guild.members.unban(userId, reason);
        await interaction.reply({ content: `Unbanned user \`${userId}\`.`, ephemeral: true });
      } catch {
        await interaction.reply({ content: "Could not unban that user ID. Are they actually banned?", ephemeral: true });
      }
      return;
    }

    if (sub === "timeout") {
      const target = interaction.options.getUser("user", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        return;
      }
      if (!member.moderatable) {
        await interaction.reply({ content: "I can't timeout that user (role hierarchy or missing permission).", ephemeral: true });
        return;
      }
      await member.timeout(minutes * MS_PER_MINUTE, reason);
      const id = await logInfraction(interaction.guild, target, interaction.user.id, "timeout", `${reason} (${minutes}m)`);
      await interaction.reply({ content: `Timed out <@${target.id}> for ${minutes} minute(s) (#${id}).`, ephemeral: true });
      return;
    }

    if (sub === "untimeout") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") ?? "No reason provided";
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        return;
      }
      await member.timeout(null, reason);
      await interaction.reply({ content: `Removed timeout from <@${target.id}>.`, ephemeral: true });
    }
  },
};

export default command;

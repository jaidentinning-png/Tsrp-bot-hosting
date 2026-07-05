import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { db, promotionsTable } from "../../db/index.js";
import { desc, eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { getGuildConfig } from "../config";
import { baseEmbed } from "../utils";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote or manage staff/department promotions")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("user")
        .setDescription("Promote a user and give them their new role")
        .addUserOption((opt) => opt.setName("user").setDescription("User to promote").setRequired(true))
        .addRoleOption((opt) => opt.setName("new-role").setDescription("New rank role to assign").setRequired(true))
        .addRoleOption((opt) => opt.setName("previous-role").setDescription("Previous rank role to remove"))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for promotion")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("history")
        .setDescription("View a user's promotion history")
        .addUserOption((opt) => opt.setName("user").setDescription("User to check").setRequired(true)),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "user") {
      const target = interaction.options.getUser("user", true);
      const newRole = interaction.options.getRole("new-role", true);
      const previousRole = interaction.options.getRole("previous-role");
      const reason = interaction.options.getString("reason") ?? "No reason provided";

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) {
        await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
        return;
      }

      const me = interaction.guild.members.me;
      if (me && newRole.position >= me.roles.highest.position) {
        await interaction.reply({
          content: `I can't assign **${newRole.name}** — it's above or equal to my highest role. Move my role above it.`,
          ephemeral: true,
        });
        return;
      }

      try {
        await member.roles.add(newRole.id, reason);
        if (previousRole && member.roles.cache.has(previousRole.id)) {
          await member.roles.remove(previousRole.id, reason).catch(() => null);
        }
      } catch {
        await interaction.reply({
          content: "I couldn't update that member's roles (role hierarchy or missing permission).",
          ephemeral: true,
        });
        return;
      }

      await db.insert(promotionsTable).values({
        guildId: interaction.guild.id,
        userId: target.id,
        moderatorId: interaction.user.id,
        fromRank: previousRole?.name,
        toRank: newRole.name,
        reason,
      });

      const embed = baseEmbed(config.embedColor)
        .setTitle("🎉 Promotion")
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: "User", value: `<@${target.id}>`, inline: true },
          { name: "Promoted By", value: `<@${interaction.user.id}>`, inline: true },
          { name: "New Rank", value: `<@&${newRole.id}>`, inline: true },
          ...(previousRole ? [{ name: "Previous Rank", value: `<@&${previousRole.id}>`, inline: true }] : []),
          { name: "Reason", value: reason },
        )
        .setTimestamp(new Date());

      const channelId = config.promotionChannelId;
      if (channelId) {
        const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
        if (channel?.isTextBased()) {
          await channel.send({ embeds: [embed] });
        }
      }

      await target.send({ embeds: [embed] }).catch(() => null);
      await interaction.reply({ content: `Promoted <@${target.id}> to **${newRole.name}**.`, ephemeral: true });
      return;
    }

    if (sub === "history") {
      const target = interaction.options.getUser("user", true);
      const records = await db
        .select()
        .from(promotionsTable)
        .where(eq(promotionsTable.userId, target.id))
        .orderBy(desc(promotionsTable.createdAt))
        .limit(10);

      if (records.length === 0) {
        await interaction.reply({ content: `${target.username} has no promotion history.`, ephemeral: true });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle(`Promotion History — ${target.username}`)
        .setDescription(
          records
            .map(
              (r) =>
                `**${r.toRank}**${r.fromRank ? ` (from ${r.fromRank})` : ""} — <t:${Math.floor(r.createdAt.getTime() / 1000)}:d> by <@${r.moderatorId}>`,
            )
            .join("\n"),
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default command;

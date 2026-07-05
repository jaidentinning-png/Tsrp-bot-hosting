import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../types";
import { getGuildConfig, updateGuildConfig } from "../config";
import { baseEmbed } from "../utils";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure TSRP Bot for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Set a channel used by the bot")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Which channel to set")
            .setRequired(true)
            .addChoices(
              { name: "Session Announcements", value: "sessionChannelId" },
              { name: "Promotion Announcements", value: "promotionChannelId" },
              { name: "Infraction Log", value: "infractionLogChannelId" },
              { name: "Staff Infraction Log", value: "staffInfractionLogChannelId" },
              { name: "Ticket Log", value: "ticketLogChannelId" },
            ),
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to use")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-category")
        .setDescription("Set the category tickets are created under")
        .addChannelOption((opt) =>
          opt
            .setName("category")
            .setDescription("Category channel")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-role")
        .setDescription("Set a role used by the bot")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Which role to set")
            .setRequired(true)
            .addChoices(
              { name: "Staff Role", value: "staffRoleId" },
              { name: "Admin Role", value: "adminRoleId" },
              { name: "Session Ping Role", value: "sessionPingRoleId" },
            ),
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to use").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-color")
        .setDescription("Set the default embed color used across the bot")
        .addStringOption((opt) =>
          opt
            .setName("hex")
            .setDescription("Hex color, e.g. #5865F2")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current server configuration"),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "set-channel") {
      const type = interaction.options.getString("type", true) as
        | "sessionChannelId"
        | "promotionChannelId"
        | "infractionLogChannelId"
        | "staffInfractionLogChannelId"
        | "ticketLogChannelId";
      const channel = interaction.options.getChannel("channel", true);
      await updateGuildConfig(interaction.guild.id, { [type]: channel.id });
      await interaction.reply({
        content: `Updated **${type}** to <#${channel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "set-category") {
      const category = interaction.options.getChannel("category", true);
      await updateGuildConfig(interaction.guild.id, {
        ticketCategoryId: category.id,
      });
      await interaction.reply({
        content: `Tickets will now be created under **${category.name}**.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "set-role") {
      const type = interaction.options.getString("type", true) as
        | "staffRoleId"
        | "adminRoleId"
        | "sessionPingRoleId";
      const role = interaction.options.getRole("role", true);
      await updateGuildConfig(interaction.guild.id, { [type]: role.id });
      await interaction.reply({
        content: `Updated **${type}** to <@&${role.id}>.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "set-color") {
      const hex = interaction.options.getString("hex", true);
      await updateGuildConfig(interaction.guild.id, { embedColor: hex });
      await interaction.reply({
        content: `Default embed color updated to \`${hex}\`.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "view") {
      const config = await getGuildConfig(interaction.guild.id);
      const embed = baseEmbed(config.embedColor)
        .setTitle("TSRP Bot Configuration")
        .addFields(
          {
            name: "Session Channel",
            value: config.sessionChannelId ? `<#${config.sessionChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Promotion Channel",
            value: config.promotionChannelId ? `<#${config.promotionChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Infraction Log",
            value: config.infractionLogChannelId ? `<#${config.infractionLogChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Staff Infraction Log",
            value: config.staffInfractionLogChannelId ? `<#${config.staffInfractionLogChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Ticket Log",
            value: config.ticketLogChannelId ? `<#${config.ticketLogChannelId}>` : "Not set",
            inline: true,
          },
          {
            name: "Ticket Category",
            value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : "Not set",
            inline: true,
          },
          {
            name: "Staff Role",
            value: config.staffRoleId ? `<@&${config.staffRoleId}>` : "Not set",
            inline: true,
          },
          {
            name: "Admin Role",
            value: config.adminRoleId ? `<@&${config.adminRoleId}>` : "Not set",
            inline: true,
          },
          {
            name: "Session Ping Role",
            value: config.sessionPingRoleId ? `<@&${config.sessionPingRoleId}>` : "Not set",
            inline: true,
          },
          { name: "Embed Color", value: config.embedColor, inline: true },
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};

export default command;

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
    .setName("dashboard")
    .setDescription("Manage the server information dashboard embed")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set the dashboard content")
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Dashboard title").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Dashboard description")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("thumbnail").setDescription("Thumbnail image URL"),
        )
        .addStringOption((opt) =>
          opt.setName("image").setDescription("Banner image URL"),
        )
        .addStringOption((opt) =>
          opt.setName("footer").setDescription("Footer text"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add-field")
        .setDescription("Add a channel/link field to the dashboard")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Field name, e.g. #dashboard").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("value").setDescription("Field value / description").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("clear-fields").setDescription("Remove all dashboard fields"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Post the dashboard embed to a channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel to post the dashboard in")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
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
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "set") {
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);
      const thumbnail = interaction.options.getString("thumbnail");
      const image = interaction.options.getString("image");
      const footer = interaction.options.getString("footer");
      await updateGuildConfig(interaction.guild.id, {
        dashboardTitle: title,
        dashboardDescription: description,
        dashboardThumbnail: thumbnail,
        dashboardImage: image,
        dashboardFooter: footer,
      });
      await interaction.reply({
        content: "Dashboard content updated. Use `/dashboard add-field` to add channel/link entries, then `/dashboard send`.",
        ephemeral: true,
      });
      return;
    }

    if (sub === "add-field") {
      const name = interaction.options.getString("name", true);
      const value = interaction.options.getString("value", true);
      const fields = [...config.dashboardFields, { name, value, inline: false }];
      await updateGuildConfig(interaction.guild.id, { dashboardFields: fields });
      await interaction.reply({
        content: `Added field **${name}** (${fields.length} total).`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "clear-fields") {
      await updateGuildConfig(interaction.guild.id, { dashboardFields: [] });
      await interaction.reply({ content: "Cleared all dashboard fields.", ephemeral: true });
      return;
    }

    if (sub === "send") {
      const channel = interaction.options.getChannel("channel", true);
      const resolved = await interaction.guild.channels.fetch(channel.id);
      if (!resolved?.isTextBased()) {
        await interaction.reply({ content: "That channel isn't a text channel.", ephemeral: true });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle(config.dashboardTitle ?? interaction.guild.name)
        .setDescription(config.dashboardDescription ?? "Welcome!");

      if (config.dashboardThumbnail) embed.setThumbnail(config.dashboardThumbnail);
      if (config.dashboardImage) embed.setImage(config.dashboardImage);
      if (config.dashboardFooter) embed.setFooter({ text: config.dashboardFooter });
      if (config.dashboardFields.length > 0) embed.addFields(config.dashboardFields);

      await resolved.send({ embeds: [embed] });
      await interaction.reply({ content: `Dashboard posted in <#${channel.id}>.`, ephemeral: true });
    }
  },
};

export default command;

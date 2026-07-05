import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { customEmbedsTable, db } from "../../db/index.js";
import { and, eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { baseEmbed } from "../utils";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Create and send fully custom embed messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a reusable custom embed template")
        .addStringOption((opt) => opt.setName("name").setDescription("Template name").setRequired(true))
        .addStringOption((opt) => opt.setName("title").setDescription("Embed title"))
        .addStringOption((opt) => opt.setName("description").setDescription("Embed description"))
        .addStringOption((opt) => opt.setName("color").setDescription("Hex color, e.g. #5865F2"))
        .addStringOption((opt) => opt.setName("image").setDescription("Image URL"))
        .addStringOption((opt) => opt.setName("thumbnail").setDescription("Thumbnail URL"))
        .addStringOption((opt) => opt.setName("footer").setDescription("Footer text")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Send a saved custom embed to a channel")
        .addStringOption((opt) => opt.setName("name").setDescription("Template name").setRequired(true))
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("Channel to send in").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List saved embed templates"))
    .addSubcommand((sub) =>
      sub
        .setName("say")
        .setDescription("Send a quick one-off custom embed")
        .addStringOption((opt) => opt.setName("title").setDescription("Embed title").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Embed description").setRequired(true))
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("Channel to send in").addChannelTypes(ChannelType.GuildText).setRequired(true),
        )
        .addStringOption((opt) => opt.setName("color").setDescription("Hex color, e.g. #5865F2")),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const name = interaction.options.getString("name", true).toLowerCase();
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color") ?? "#5865F2";
      const image = interaction.options.getString("image");
      const thumbnail = interaction.options.getString("thumbnail");
      const footer = interaction.options.getString("footer");

      const [existing] = await db
        .select()
        .from(customEmbedsTable)
        .where(and(eq(customEmbedsTable.guildId, interaction.guild.id), eq(customEmbedsTable.name, name)))
        .limit(1);

      if (existing) {
        await db
          .update(customEmbedsTable)
          .set({ title, description, color, imageUrl: image, thumbnailUrl: thumbnail, footer })
          .where(eq(customEmbedsTable.id, existing.id));
      } else {
        await db.insert(customEmbedsTable).values({
          guildId: interaction.guild.id,
          name,
          title,
          description,
          color,
          imageUrl: image,
          thumbnailUrl: thumbnail,
          footer,
        });
      }

      await interaction.reply({ content: `Saved custom embed template **${name}**.`, ephemeral: true });
      return;
    }

    if (sub === "list") {
      const templates = await db
        .select()
        .from(customEmbedsTable)
        .where(eq(customEmbedsTable.guildId, interaction.guild.id));

      if (templates.length === 0) {
        await interaction.reply({ content: "No custom embed templates yet. Create one with `/embed create`.", ephemeral: true });
        return;
      }

      await interaction.reply({
        content: `Saved templates: ${templates.map((t) => `\`${t.name}\``).join(", ")}`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "send") {
      const name = interaction.options.getString("name", true).toLowerCase();
      const channel = interaction.options.getChannel("channel", true);
      const [template] = await db
        .select()
        .from(customEmbedsTable)
        .where(and(eq(customEmbedsTable.guildId, interaction.guild.id), eq(customEmbedsTable.name, name)))
        .limit(1);

      if (!template) {
        await interaction.reply({ content: `No template named **${name}**.`, ephemeral: true });
        return;
      }

      const resolved = await interaction.guild.channels.fetch(channel.id);
      if (!resolved?.isTextBased()) {
        await interaction.reply({ content: "That channel isn't a text channel.", ephemeral: true });
        return;
      }

      const embed = baseEmbed(template.color);
      if (template.title) embed.setTitle(template.title);
      if (template.description) embed.setDescription(template.description);
      if (template.imageUrl) embed.setImage(template.imageUrl);
      if (template.thumbnailUrl) embed.setThumbnail(template.thumbnailUrl);
      if (template.footer) embed.setFooter({ text: template.footer });

      await resolved.send({ embeds: [embed] });
      await interaction.reply({ content: `Sent **${name}** to <#${channel.id}>.`, ephemeral: true });
      return;
    }

    if (sub === "say") {
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);
      const channel = interaction.options.getChannel("channel", true);
      const color = interaction.options.getString("color") ?? "#5865F2";

      const resolved = await interaction.guild.channels.fetch(channel.id);
      if (!resolved?.isTextBased()) {
        await interaction.reply({ content: "That channel isn't a text channel.", ephemeral: true });
        return;
      }

      const embed = baseEmbed(color).setTitle(title).setDescription(description);
      await resolved.send({ embeds: [embed] });
      await interaction.reply({ content: `Sent to <#${channel.id}>.`, ephemeral: true });
    }
  },
};

export default command;

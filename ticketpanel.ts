import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { db, ticketPanelsTable } from "../../db/index.js";
import { eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { buildTicketPanelMessage } from "../tickets";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Build and manage multi-category ticket panels")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a new ticket panel")
        .addStringOption((opt) => opt.setName("title").setDescription("Panel title").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Panel description").setRequired(true))
        .addStringOption((opt) => opt.setName("color").setDescription("Hex color, e.g. #5865F2")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add-category")
        .setDescription("Add a ticket category/button to a panel")
        .addIntegerOption((opt) => opt.setName("panel-id").setDescription("Panel ID").setRequired(true))
        .addStringOption((opt) => opt.setName("label").setDescription("Button label, e.g. General Support").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("What this category is for").setRequired(true))
        .addStringOption((opt) => opt.setName("emoji").setDescription("Emoji for the button, e.g. 🎫")),
    )
    .addSubcommand((sub) =>
      sub
        .setName("post")
        .setDescription("Post (or repost) a panel to a channel")
        .addIntegerOption((opt) => opt.setName("panel-id").setDescription("Panel ID").setRequired(true))
        .addChannelOption((opt) =>
          opt.setName("channel").setDescription("Channel to post in").addChannelTypes(ChannelType.GuildText).setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List ticket panels in this server")),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();

    if (sub === "create") {
      const title = interaction.options.getString("title", true);
      const description = interaction.options.getString("description", true);
      const color = interaction.options.getString("color") ?? "#5865F2";

      const [panel] = await db
        .insert(ticketPanelsTable)
        .values({ guildId: interaction.guild.id, channelId: "", title, description, color, categories: [] })
        .returning();

      await interaction.reply({
        content: `Created panel **#${panel?.id}**. Add categories with \`/ticketpanel add-category panel-id:${panel?.id}\`, then post it with \`/ticketpanel post\`.`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "add-category") {
      const panelId = interaction.options.getInteger("panel-id", true);
      const label = interaction.options.getString("label", true);
      const description = interaction.options.getString("description", true);
      const emoji = interaction.options.getString("emoji") ?? "🎫";

      const [panel] = await db.select().from(ticketPanelsTable).where(eq(ticketPanelsTable.id, panelId)).limit(1);
      if (!panel || panel.guildId !== interaction.guild.id) {
        await interaction.reply({ content: `No panel found with ID #${panelId}.`, ephemeral: true });
        return;
      }
      if (panel.categories.length >= 5) {
        await interaction.reply({ content: "A panel can have at most 5 categories.", ephemeral: true });
        return;
      }

      const categoryId = `${panelId}-${panel.categories.length}-${Date.now().toString(36)}`;
      const categories = [...panel.categories, { id: categoryId, label, emoji, description }];
      await db.update(ticketPanelsTable).set({ categories }).where(eq(ticketPanelsTable.id, panelId));

      await interaction.reply({
        content: `Added category **${label}** to panel #${panelId} (${categories.length}/5).`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "post") {
      const panelId = interaction.options.getInteger("panel-id", true);
      const channel = interaction.options.getChannel("channel", true);

      const [panel] = await db.select().from(ticketPanelsTable).where(eq(ticketPanelsTable.id, panelId)).limit(1);
      if (!panel || panel.guildId !== interaction.guild.id) {
        await interaction.reply({ content: `No panel found with ID #${panelId}.`, ephemeral: true });
        return;
      }
      if (panel.categories.length === 0) {
        await interaction.reply({ content: "Add at least one category before posting this panel.", ephemeral: true });
        return;
      }

      const resolved = await interaction.guild.channels.fetch(channel.id);
      if (!resolved?.isTextBased()) {
        await interaction.reply({ content: "That channel isn't a text channel.", ephemeral: true });
        return;
      }

      const { embeds, components } = buildTicketPanelMessage(panel);
      const message = await resolved.send({ embeds, components });
      await db.update(ticketPanelsTable).set({ channelId: channel.id, messageId: message.id }).where(eq(ticketPanelsTable.id, panelId));

      await interaction.reply({ content: `Panel #${panelId} posted in <#${channel.id}>.`, ephemeral: true });
      return;
    }

    if (sub === "list") {
      const panels = await db.select().from(ticketPanelsTable).where(eq(ticketPanelsTable.guildId, interaction.guild.id));
      if (panels.length === 0) {
        await interaction.reply({ content: "No ticket panels yet. Create one with `/ticketpanel create`.", ephemeral: true });
        return;
      }
      await interaction.reply({
        content: panels
          .map((p) => `**#${p.id}** — ${p.title} (${p.categories.length} categories)${p.channelId ? ` — posted in <#${p.channelId}>` : " — not posted"}`)
          .join("\n"),
        ephemeral: true,
      });
    }
  },
};

export default command;

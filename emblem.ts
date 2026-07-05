import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types";
import { generateEmblem } from "../emblem";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("emblem")
    .setDescription("Generate a custom department/team emblem")
    .addStringOption((opt) => opt.setName("text").setDescription("Main text, e.g. PD, FD, SWAT").setRequired(true))
    .addStringOption((opt) => opt.setName("subtext").setDescription("Small text under the main text"))
    .addStringOption((opt) => opt.setName("primary-color").setDescription("Primary hex color, e.g. #1e3a5f"))
    .addStringOption((opt) => opt.setName("secondary-color").setDescription("Secondary/accent hex color, e.g. #f2c94c"))
    .addStringOption((opt) =>
      opt
        .setName("shape")
        .setDescription("Emblem shape")
        .addChoices(
          { name: "Shield", value: "shield" },
          { name: "Circle", value: "circle" },
          { name: "Badge (star)", value: "badge" },
        ),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const text = interaction.options.getString("text", true);
    const subtext = interaction.options.getString("subtext") ?? undefined;
    const primaryColor = interaction.options.getString("primary-color") ?? "#1e3a5f";
    const secondaryColor = interaction.options.getString("secondary-color") ?? "#f2c94c";
    const shape = (interaction.options.getString("shape") as "shield" | "circle" | "badge") ?? "shield";

    const buffer = generateEmblem({ text, subtext, primaryColor, secondaryColor, shape });
    const attachment = new AttachmentBuilder(buffer, { name: "emblem.png" });

    await interaction.editReply({
      content: `Here's your emblem, <@${interaction.user.id}>.`,
      files: [attachment],
    });
  },
};

export default command;

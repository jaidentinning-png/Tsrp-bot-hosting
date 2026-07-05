import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types";
import { closeTicket, getTicketByChannel } from "../tickets";

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the current ticket channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) => sub.setName("close").setDescription("Close this ticket"))
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a user to this ticket")
        .addUserOption((opt) => opt.setName("user").setDescription("User to add").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a user from this ticket")
        .addUserOption((opt) => opt.setName("user").setDescription("User to remove").setRequired(true)),
    ),
  async execute(interaction) {
    if (!interaction.guild || !interaction.channel || !interaction.member) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const ticket = await getTicketByChannel(interaction.channel.id);
    if (!ticket) {
      await interaction.reply({ content: "This isn't a ticket channel.", ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const channel = interaction.channel;
    if (!("permissionOverwrites" in channel)) {
      await interaction.reply({ content: "Unsupported channel type.", ephemeral: true });
      return;
    }

    if (sub === "close") {
      await interaction.reply({ content: "Closing ticket in 5 seconds..." });
      const messages = await channel.messages.fetch({ limit: 100 });
      const transcript = [...messages.values()]
        .reverse()
        .map((m) => `${m.author.tag}: ${m.content}`)
        .join("\n");

      const guild = interaction.guild;
      const member = interaction.member;
      setTimeout(() => {
        void (async () => {
          try {
            await closeTicket(guild, member as any, ticket.id, transcript);
            await channel.delete();
          } catch {
            // ignore cleanup errors
          }
        })();
      }, 5000);
      return;
    }

    if (sub === "add") {
      const user = interaction.options.getUser("user", true);
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await interaction.reply({ content: `Added <@${user.id}> to this ticket.` });
      return;
    }

    if (sub === "remove") {
      const user = interaction.options.getUser("user", true);
      await channel.permissionOverwrites.edit(user.id, { ViewChannel: false });
      await interaction.reply({ content: `Removed <@${user.id}> from this ticket.` });
    }
  },
};

export default command;

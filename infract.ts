import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  db,
  staffInfractionsTable,
  STAFF_INFRACTION_LABELS,
  type StaffInfractionType,
} from "../../db/index.js";
import { and, desc, eq } from "drizzle-orm";
import type { SlashCommand } from "../types";
import { getGuildConfig } from "../config";
import { logStaffInfraction } from "../staffInfractionLog";
import { baseEmbed } from "../utils";

const TYPE_CHOICES: { name: string; value: StaffInfractionType }[] = [
  { name: "Verbal Warning", value: "verbal_warning" },
  { name: "Strike (Written Warning)", value: "strike" },
  { name: "Suspension", value: "suspension" },
  { name: "Demotion", value: "demotion" },
  { name: "Termination", value: "termination" },
  { name: "Blacklist", value: "blacklist" },
];

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("infract")
    .setDescription("Issue or manage staff infractions (internal team punishments)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName("issue")
        .setDescription("Issue an infraction to a staff member")
        .addUserOption((opt) => opt.setName("staff").setDescription("Staff member to infract").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Infraction type")
            .setRequired(true)
            .addChoices(...TYPE_CHOICES),
        )
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("history")
        .setDescription("View a staff member's infraction history")
        .addUserOption((opt) => opt.setName("staff").setDescription("Staff member to check").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Void a staff infraction by ID")
        .addIntegerOption((opt) => opt.setName("id").setDescription("Infraction ID").setRequired(true)),
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "Server only.", ephemeral: true });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const config = await getGuildConfig(interaction.guild.id);

    if (sub === "issue") {
      const staff = interaction.options.getUser("staff", true);
      const type = interaction.options.getString("type", true) as StaffInfractionType;
      const reason = interaction.options.getString("reason", true);

      const id = await logStaffInfraction(interaction.guild, staff, interaction.user.id, type, reason);

      await staff
        .send({
          embeds: [
            baseEmbed(config.embedColor)
              .setTitle(`Staff Infraction Issued — ${STAFF_INFRACTION_LABELS[type]}`)
              .addFields({ name: "Server", value: interaction.guild.name }, { name: "Reason", value: reason }),
          ],
        })
        .catch(() => null);

      await interaction.reply({
        content: `Issued **${STAFF_INFRACTION_LABELS[type]}** to <@${staff.id}> (#${id}).`,
        ephemeral: true,
      });
      return;
    }

    if (sub === "history") {
      const staff = interaction.options.getUser("staff", true);
      const records = await db
        .select()
        .from(staffInfractionsTable)
        .where(and(eq(staffInfractionsTable.guildId, interaction.guild.id), eq(staffInfractionsTable.staffUserId, staff.id)))
        .orderBy(desc(staffInfractionsTable.createdAt))
        .limit(20);

      if (records.length === 0) {
        await interaction.reply({
          content: `<@${staff.id}> (\`${staff.id}\`) has a clean staff record in this server.`,
          ephemeral: true,
        });
        return;
      }

      const embed = baseEmbed(config.embedColor)
        .setTitle(`Staff Infraction History — ${staff.username}`)
        .setDescription(
          records
            .map((r) => {
              const label = STAFF_INFRACTION_LABELS[r.type as StaffInfractionType] ?? r.type;
              const line = `**#${r.id} — ${label}**: ${r.reason} (<t:${Math.floor(r.createdAt.getTime() / 1000)}:d>, by <@${r.issuerId}>)`;
              return r.active ? line : `~~${line}~~ (voided)`;
            })
            .join("\n"),
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "remove") {
      const id = interaction.options.getInteger("id", true);
      const [updated] = await db
        .update(staffInfractionsTable)
        .set({ active: false })
        .where(and(eq(staffInfractionsTable.id, id), eq(staffInfractionsTable.guildId, interaction.guild.id)))
        .returning();

      if (!updated) {
        await interaction.reply({ content: `No staff infraction found with ID #${id}.`, ephemeral: true });
        return;
      }

      await interaction.reply({ content: `Voided staff infraction #${id}.`, ephemeral: true });
    }
  },
};

export default command;

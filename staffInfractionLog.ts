import {
  db,
  staffInfractionsTable,
  STAFF_INFRACTION_LABELS,
  type StaffInfractionType,
} from "../db/index.js";
import type { Guild, User } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildConfig } from "./config";
import { baseEmbed } from "./utils";

export async function logStaffInfraction(
  guild: Guild,
  staff: User,
  issuerId: string,
  type: StaffInfractionType,
  reason: string,
): Promise<number> {
  const [record] = await db
    .insert(staffInfractionsTable)
    .values({
      guildId: guild.id,
      staffUserId: staff.id,
      issuerId,
      type,
      reason,
    })
    .returning();

  if (!record) {
    throw new Error("Failed to record staff infraction");
  }

  const config = await getGuildConfig(guild.id);
  const logChannelId = config.staffInfractionLogChannelId ?? config.infractionLogChannelId;
  if (logChannelId) {
    const channel = await guild.channels.fetch(logChannelId).catch(() => null);
    if (channel?.isTextBased()) {
      const embed: EmbedBuilder = baseEmbed(config.embedColor)
        .setTitle(`Staff Infraction #${record.id} — ${STAFF_INFRACTION_LABELS[type]}`)
        .setThumbnail(staff.displayAvatarURL())
        .addFields(
          { name: "Staff Member", value: `<@${staff.id}> (${staff.id})`, inline: true },
          { name: "Issued By", value: `<@${issuerId}>`, inline: true },
          { name: "Reason", value: reason },
        )
        .setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
    }
  }

  return record.id;
}

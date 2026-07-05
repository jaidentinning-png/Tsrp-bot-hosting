import { db, infractionsTable } from "../db/index.js";
import type { Guild, User } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { getGuildConfig } from "./config";
import { baseEmbed } from "./utils";

export async function logInfraction(
  guild: Guild,
  target: User,
  moderatorId: string,
  type: string,
  reason: string,
): Promise<number> {
  const [record] = await db
    .insert(infractionsTable)
    .values({
      guildId: guild.id,
      userId: target.id,
      moderatorId,
      type,
      reason,
    })
    .returning();

  if (!record) {
    throw new Error("Failed to record infraction");
  }

  const config = await getGuildConfig(guild.id);
  if (config.infractionLogChannelId) {
    const channel = await guild.channels
      .fetch(config.infractionLogChannelId)
      .catch(() => null);
    if (channel?.isTextBased()) {
      const embed: EmbedBuilder = baseEmbed(config.embedColor)
        .setTitle(`Infraction #${record.id} — ${type.toUpperCase()}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: "User", value: `<@${target.id}> (${target.id})`, inline: true },
          { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
          { name: "Reason", value: reason },
        )
        .setTimestamp(new Date());
      await channel.send({ embeds: [embed] });
    }
  }

  return record.id;
}

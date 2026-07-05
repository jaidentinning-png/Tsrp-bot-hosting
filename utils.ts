import { EmbedBuilder } from "discord.js";

export function parseColor(input: string | null | undefined): number {
  const fallback = 0x5865f2;
  if (!input) return fallback;
  const hex = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  return parseInt(hex, 16);
}

export function baseEmbed(color?: string | null): EmbedBuilder {
  return new EmbedBuilder().setColor(parseColor(color));
}

export function truncate(value: string, max = 1024): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

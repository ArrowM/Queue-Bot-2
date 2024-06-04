import { ChannelType, type Snowflake } from "discord.js";

import type { DbGuild } from "../db/schema.ts";

// /  Channel types

export const TEXT_CHANNELS = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
] as const;

export const VOICE_CHANNELS = [
	ChannelType.GuildVoice,
	ChannelType.GuildStageVoice,
] as const;

// /  Other

export const TIMEZONES = Intl.supportedValuesOf("timeZone");
export const LOWER_TIMEZONES = TIMEZONES.map(tz => tz.toLowerCase());


export type PendingGuildUpdates = {
	[K in Snowflake]?: {
		[P in keyof Omit<DbGuild, "guildId" | "joinTime" | "lastUpdateTime">]?: number;
	};
}
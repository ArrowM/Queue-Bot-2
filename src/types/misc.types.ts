import { ChannelType } from "discord.js";

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

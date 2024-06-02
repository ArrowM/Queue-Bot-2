import type { Guild } from "discord.js";

import { QueryUtils } from "../utils/query.utils.ts";

export namespace ClientHandler {
	export function handleGuildCreate(guild: Guild) {
		try {
			QueryUtils.insertGuild({ guildId: guild.id });
		}
		catch {
			// ignore
		}
	}

	export function handleGuildDelete(guild: Guild) {
		try {
			QueryUtils.deleteGuild({ guildId: guild.id });
		}
		catch {
			// ignore
		}
	}
}
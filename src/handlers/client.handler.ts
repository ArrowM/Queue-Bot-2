import type { Guild } from "discord.js";

import { Store } from "../core/store.ts";
import { QueryUtils } from "../utils/query.utils.ts";

export namespace ClientHandler {
	export function handleGuildCreate(guild: Guild) {
		try {
			new Store(guild);
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
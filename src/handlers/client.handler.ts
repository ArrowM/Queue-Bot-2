import type { Guild } from "discord.js";

import { QueryUtils } from "../db/queries.ts";
import { Store } from "../db/store.ts";

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
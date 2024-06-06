import { type GuildMember, Role } from "discord.js";

import type { Store } from "../core/store.ts";
import type { DbQueue, DbWhitelisted } from "../db/schema.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { filterDbObjectsOnJsMember, map } from "./misc.utils.ts";

export namespace WhitelistUtils {
	export function insertWhitelisted(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, mentionable: Mentionable, reason?: string): DbWhitelisted[] {
		// insert into db
		return map(queues, queue => store.insertWhitelisted({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
		}));
	}

	export function deleteWhitelisted(store: Store, whitelistedIds: bigint[]): DbWhitelisted[] {
		// delete from db
		return whitelistedIds.map(id => store.deleteWhitelisted({ id }));
	}

	export function isBlockedByWhitelist(store: Store, queueId: bigint, jsMember: GuildMember): boolean {
		const whitelistedOfQueue = store.dbWhitelisted().filter(blacklisted => queueId === blacklisted.queueId);
		if (whitelistedOfQueue.size === 0) return false;
		const whitelistedOfMember = filterDbObjectsOnJsMember(whitelistedOfQueue, jsMember);
		return whitelistedOfMember.size === 0;
	}
}
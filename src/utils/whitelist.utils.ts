import { type Collection, type GuildMember, Role } from "discord.js";

import type { Store } from "../core/store.ts";
import type { DbQueue, DbWhitelisted } from "../db/schema.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { map } from "./misc.utils.ts";

export namespace WhitelistUtils {
	export function insertWhitelisted(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, mentionable: Mentionable, reason?: string): DbWhitelisted[] {
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

	export function isBlockedByWhitelist(store: Store, queueId: bigint, member: GuildMember): boolean {
		const scopedWhitelisted = store.dbWhitelisted().filter(blacklisted => queueId === blacklisted.queueId);
		if (!scopedWhitelisted.size) return false;
		return scopedWhitelisted.some(whitelisted =>
			(whitelisted.subjectId === member.id) ||
			(Array.isArray(member.roles)
				? member.roles.some(role => role.id === whitelisted.subjectId)
				: member.roles.cache.has(whitelisted.subjectId)),
		);
	}
}
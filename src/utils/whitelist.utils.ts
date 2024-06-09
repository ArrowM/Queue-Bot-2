import { type GuildMember, Role } from "discord.js";
import { uniq } from "lodash-es";

import type { DbQueue } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { filterDbObjectsOnJsMember, map } from "./misc.utils.ts";

export namespace WhitelistUtils {
	export function insertWhitelisted(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, mentionable: Mentionable, reason?: string) {
		// insert into db
		const insertedWhitelisted = map(queues, queue => store.insertWhitelisted({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
		}));
		const updatedQueueIds = uniq(insertedWhitelisted.map(whitelisted => whitelisted.queueId));

		return { insertedWhitelisted, updatedQueueIds };
	}

	export function deleteWhitelisted(store: Store, whitelistedIds: bigint[]) {
		// delete from db
		const deletedWhitelisted = whitelistedIds.map(id => store.deleteWhitelisted({ id }));
		const updatedQueueIds = uniq(deletedWhitelisted.map(whitelisted => whitelisted.queueId));

		return { deletedWhitelisted, updatedQueueIds };
	}

	export function isBlockedByWhitelist(store: Store, queueId: bigint, jsMember: GuildMember): boolean {
		const whitelistedOfQueue = store.dbWhitelisted().filter(blacklisted => queueId === blacklisted.queueId);
		if (whitelistedOfQueue.size === 0) return false;
		const whitelistedOfMember = filterDbObjectsOnJsMember(whitelistedOfQueue, jsMember);
		return whitelistedOfMember.size === 0;
	}
}
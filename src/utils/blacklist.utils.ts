import { type GuildMember, Role } from "discord.js";
import { uniq } from "lodash-es";

import type { DbQueue } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import { ArchivedMemberReason } from "../types/db.types.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { MemberUtils } from "./member.utils.ts";
import { filterDbObjectsOnJsMember, map } from "./misc.utils.ts";

export namespace BlacklistUtils {
	export async function insertBlacklisted(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, mentionable: Mentionable, reason?: string) {
		// insert into db
		const insertedBlacklisted = map(queues, queue => store.insertBlacklisted({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
		}));
		const updatedQueueIds = uniq(insertedBlacklisted.map(blacklisted => blacklisted.queueId));

		// delete members
		const by = (mentionable instanceof Role) ? { roleId: mentionable.id } : { userId: mentionable.id };
		await MemberUtils.deleteMembers({ store, queues: queues, reason: ArchivedMemberReason.Kicked, by, force: true });

		return { insertedBlacklisted, updatedQueueIds };
	}

	export function deleteBlacklisted(store: Store, blacklistedIds: bigint[]) {
		// delete from db
		const deletedBlacklisted = blacklistedIds.map(id => store.deleteBlacklisted({ id }));
		const updatedQueueIds = uniq(deletedBlacklisted.map(blacklisted => blacklisted.queueId));

		return { deletedBlacklisted, updatedQueueIds };
	}

	export function isBlockedByBlacklist(store: Store, queueId: bigint, jsMember: GuildMember): boolean {
		const blacklistedOfQueue = store.dbBlacklisted().filter(blacklisted => blacklisted.queueId == queueId);
		const blacklistedOfMember = filterDbObjectsOnJsMember(blacklistedOfQueue, jsMember);
		return blacklistedOfMember.size > 0;
	}
}
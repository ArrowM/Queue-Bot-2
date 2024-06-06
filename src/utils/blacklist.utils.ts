import { type Collection, type GuildMember, Role } from "discord.js";

import type { Store } from "../core/store.ts";
import type { DbBlacklisted, DbQueue } from "../db/schema.ts";
import { ArchivedMemberReason } from "../types/db.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { MemberUtils } from "./member.utils.ts";
import { map } from "./misc.utils.ts";

export namespace BlacklistUtils {
	export function insertBlacklisted(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, mentionable: Mentionable, reason?: string) {
		// insert into db
		const insertedBlacklisted = map(queues, queue => store.insertBlacklisted({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
		}));

		// re-evaluate blacklisted & update displays
		const queuesToUpdate = insertedBlacklisted
			.map(blacklisted => store.dbQueues().get(blacklisted.queueId))
			.flat();
		const by = (mentionable instanceof Role) ? { roleId: mentionable.id } : { userId: mentionable.id };
		MemberUtils.deleteMembers({ store, queues: queuesToUpdate, reason: ArchivedMemberReason.Kicked, by, force: true });
		DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id));

		return { insertedBlacklisted, updatedQueues: queuesToUpdate };
	}

	export function deleteBlacklisted(store: Store, blacklistedIds: bigint[]): DbBlacklisted[] {
		// delete from db
		return blacklistedIds.map(id => store.deleteBlacklisted({ id }));
	}

	export function isBlockedByBlacklist(store: Store, queueId: bigint, member: GuildMember): boolean {
		const scopedBlacklisted = store.dbBlacklisted().filter(blacklisted => blacklisted.queueId == queueId);
		return scopedBlacklisted.some(blacklisted =>
			(blacklisted.subjectId === member.id) ||
			(Array.isArray(member.roles)
				? member.roles.some(role => role.id === blacklisted.subjectId)
				: member.roles.cache.has(blacklisted.subjectId)),
		);
	}
}
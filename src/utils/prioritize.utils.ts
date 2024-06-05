import { type Collection, Role } from "discord.js";

import type { Store } from "../core/store.ts";
import type { DbQueue } from "../db/schema.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { map } from "./misc.utils.ts";

export namespace PrioritizeUtils {
	export function insertPrioritized(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, mentionable: Mentionable, reason?: string) {
		// insert into db
		const insertedPrioritized = map(queues, queue => store.insertPrioritized({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
		}));

		// re-evaluate prioritized & update displays
		const queuesToUpdate = insertedPrioritized
			.map(prioritized => store.dbQueues().get(prioritized.queueId))
			.flat();

		reEvaluatePrioritized(store, queuesToUpdate)
			.then(() =>
				DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id)),
			);

		return { insertedPrioritized, updatedQueues: queuesToUpdate };
	}

	export function deletePrioritized(store: Store, prioritizedIds: bigint[]) {
		// delete from db
		const deletedPrioritized = prioritizedIds.map(id => store.deletePrioritized({ id }));

		// re-evaluate prioritized & update displays
		const queuesToUpdate = deletedPrioritized
			.map(display => store.dbQueues().get(display.queueId))
			.flat();

		reEvaluatePrioritized(store, queuesToUpdate)
			.then(() =>
				DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id)),
			);

		return { deletedPrioritized, updatedQueues: queuesToUpdate };
	}

	async function reEvaluatePrioritized(store: Store, queuesToReEvaluate: DbQueue[]) {
		for (const queue of queuesToReEvaluate) {
			const scopedPrioritized = store.dbPrioritized().filter(prioritized => queue.id === prioritized.queueId);
			const members = store.dbMembers().filter(member => member.queueId === queue.id);
			for (const member of members.values()) {
				const jsMember = await store.jsMember(member.userId);
				const isPrioritized = scopedPrioritized.some(prioritized =>
					(prioritized.subjectId === member.userId) ||
					(prioritized.isRole && jsMember.roles.cache.some(role => role.id === prioritized.subjectId)),
				);
				if (member.isPrioritized === isPrioritized) return;
				store.updateMember({ isPrioritized, ...member });
			}
		}
	}
}
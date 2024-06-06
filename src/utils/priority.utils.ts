import { type Collection, type GuildMember, Role } from "discord.js";
import { min, uniq } from "lodash-es";

import type { Store } from "../core/store.ts";
import type { DbPrioritized, DbQueue } from "../db/schema.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { map } from "./misc.utils.ts";

export namespace PriorityUtils {
	export function insertPrioritized(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, mentionable: Mentionable, reason?: string, priorityOrder?: number) {
		// insert into db
		const insertedPrioritized = map(queues, queue => store.insertPrioritized({
			guildId: store.guild.id,
			queueId: queue.id,
			subjectId: mentionable.id,
			isRole: mentionable instanceof Role,
			reason,
			priorityOrder,
		}));

		// re-evaluate prioritized & update displays
		const queuesToUpdate = uniq(
			insertedPrioritized.map(prioritized => store.dbQueues().get(prioritized.queueId)),
		);
		reEvaluatePrioritized(store, queuesToUpdate).then(() =>
			DisplayUtils.requestDisplaysUpdate(store, map(queuesToUpdate, queue => queue.id)),
		);

		return { insertedPrioritized, updatedQueues: queuesToUpdate };
	}

	export function updatePrioritized(store: Store, prioritizedIds: bigint[], update: Partial<DbPrioritized>) {
		// update in db
		const updatedPrioritized = prioritizedIds.map(id => store.updatePrioritized({ id, ...update }));

		// re-evaluate prioritized & update displays
		const queuesToUpdate = uniq(
			updatedPrioritized.map(prioritized => store.dbQueues().get(prioritized.queueId)),
		);
		reEvaluatePrioritized(store, queuesToUpdate).then(() =>
			DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id)),
		);

		return { updatedPrioritized, updatedQueues: queuesToUpdate };
	}

	export function deletePrioritized(store: Store, prioritizedIds: bigint[]) {
		// delete from db
		const deletedPrioritized = prioritizedIds.map(id => store.deletePrioritized({ id }));

		// re-evaluate prioritized & update displays
		const queuesToUpdate = uniq(
			deletedPrioritized.map(display => store.dbQueues().get(display.queueId)),
		);
		reEvaluatePrioritized(store, queuesToUpdate).then(() =>
			DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id)),
		);

		return { deletedPrioritized, updatedQueues: queuesToUpdate };
	}

	export function getMemberPriority(store: Store, queueId: bigint, jsMember: GuildMember): number | null {
		const scopedPrioritized = store.dbPrioritized().filter(prioritized => queueId === prioritized.queueId);
		const prioritizeds = scopedPrioritized.filter(prioritized =>
			(prioritized.subjectId === jsMember.id) ||
			(prioritized.isRole && jsMember.roles.cache.some(role => role.id === prioritized.subjectId)),
		);
		return prioritizeds.size ? min(prioritizeds.map(prioritized => prioritized.priorityOrder)) : undefined;
	}

	async function reEvaluatePrioritized(store: Store, queuesToReEvaluate: DbQueue[]) {
		for (const queue of queuesToReEvaluate) {
			const members = store.dbMembers().filter(member => member.queueId === queue.id);
			for (const member of members.values()) {
				const jsMember = await store.jsMember(member.userId);
				const priority = getMemberPriority(store, queue.id, jsMember);
				store.updateMember({ priority, ...member });
			}
		}
	}
}
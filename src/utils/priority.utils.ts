import { type GuildMember, Role } from "discord.js";
import { min, uniq } from "lodash-es";

import { db } from "../db/db.ts";
import type { DbPrioritized, DbQueue } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { filterDbObjectsOnJsMember, map } from "./misc.utils.ts";

export namespace PriorityUtils {
	export function insertPrioritized(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, mentionable: Mentionable, priorityOrder?: number, reason?: string) {
		const insertedPrioritized = db.transaction(() =>
		 map(queues, queue => store.insertPrioritized({
				guildId: store.guild.id,
				queueId: queue.id,
				subjectId: mentionable.id,
				isRole: mentionable instanceof Role,
				priorityOrder,
				reason,
			}))
		);
		const updatedQueueIds = uniq(insertedPrioritized.map(prioritized => prioritized.queueId));

		reEvaluatePrioritized(store, updatedQueueIds);

		return { insertedPrioritized, updatedQueueIds };
	}

	export function updatePrioritized(store: Store, prioritizedIds: bigint[], update: Partial<DbPrioritized>) {
		const updatedPrioritized = db.transaction(() =>
			prioritizedIds.map(id => store.updatePrioritized({ id, ...update }))
		);
		const updatedQueueIds = uniq(updatedPrioritized.map(prioritized => prioritized.queueId));

		reEvaluatePrioritized(store, updatedQueueIds);

		return { updatedPrioritized, updatedQueueIds };
	}

	export function deletePrioritized(store: Store, prioritizedIds: bigint[]) {
		const deletedPrioritized = db.transaction(() =>
			prioritizedIds.map(id => store.deletePrioritized({ id }))
		);
		const updatedQueueIds = uniq(deletedPrioritized.map(prioritized => prioritized.queueId));

		reEvaluatePrioritized(store, updatedQueueIds);

		return { deletedPrioritized, updatedQueueIds };
	}

	export function getMemberPriority(store: Store, queueId: bigint, jsMember: GuildMember): number | null {
		const prioritizedOfQueue = store.dbPrioritized().filter(prioritized => queueId === prioritized.queueId);
		const prioritizedOfMember = filterDbObjectsOnJsMember(prioritizedOfQueue, jsMember);
		return prioritizedOfMember.size ? min(prioritizedOfMember.map(prioritized => prioritized.priorityOrder)) : undefined;
	}

	async function reEvaluatePrioritized(store: Store, queueIds: bigint[]) {
		for (const queueId of queueIds) {
			const members = store.dbMembers().filter(member => member.queueId === queueId);
			for (const member of members.values()) {
				const jsMember = await store.jsMember(member.userId);
				const priority = getMemberPriority(store, queueId, jsMember);
				store.updateMember({ ...member, priority });
			}
		}
		DisplayUtils.requestDisplaysUpdate(store, queueIds);
	}
}
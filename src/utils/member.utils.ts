import { Collection, EmbedBuilder, GuildMember, Role, type Snowflake, userMention } from "discord.js";
import { get, groupBy } from "lodash-es";

import type { Store } from "../core/store.ts";
import { type DbMember, type DbPrioritized, type DbQueue } from "../db/schema.ts";
import type { MemberDeleteBy } from "../types/member.types.ts";
import type { NotificationOptions } from "../types/notification.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { BlacklistUtils } from "./blacklist.utils.ts";
import { DisplayUtils } from "./display.utils.ts";
import {
	NotOnQueueWhitelistError,
	OnQueueBlacklistError,
	QueueFullError,
	QueueLockedError,
} from "./error.utils.ts";
import { find, map } from "./misc.utils.ts";
import { NotificationUtils } from "./notification.utils.ts";
import { QueryUtils } from "./query.utils.ts";
import { queueMention } from "./string.utils.ts";
import { WhitelistUtils } from "./whitelist.utils.ts";

export namespace MemberUtils {
	export async function insertMentionable(store: Store, mentionable: Mentionable, queues?: Collection<bigint, DbQueue>) {
		const insertedMembers = [];
		if (mentionable instanceof GuildMember) {
			for (const queue of queues.values()) {
				const member = await insertJsMember({ store, queue: queue, jsMember: mentionable });
				insertedMembers.push(member);
			}
		}
		else if (mentionable instanceof Role) {
			for (const queue of queues.values()) {
				const members = store.guild.roles.cache.get(mentionable.id).members;
				for (const jsMember of members.values()) {
					const member = await insertJsMember({ store, queue, jsMember });
					insertedMembers.push(member);
				}
			}
		}
		return insertedMembers;
	}

	export async function insertJsMember(options: {
		store: Store,
		queue: DbQueue,
		jsMember: GuildMember,
		message?: string,
		force?: boolean,
	 }) {
		const { store, queue, jsMember, message, force } = options;
		if (!force) {
			if (queue.lockToggle) {
				throw new QueueLockedError();
			}
			if (queue.size) {
				const members = store.dbMembers().filter(member => member.queueId === queue.id);
				if (members.size >= queue.size) {
					throw new QueueFullError();
				}
			}
			if (WhitelistUtils.isBlockedByWhitelist(store, queue.id, jsMember)) {
				throw new NotOnQueueWhitelistError();
			}
			if (BlacklistUtils.isBlockedByBlacklist(store, queue.id, jsMember)) {
				throw new OnQueueBlacklistError();
			}
		}

		const prioritized = store.dbPrioritized().filter(priority => priority.queueId === queue.id);
		const isPrioritized = isPrioritizedByUser(prioritized, jsMember) || isPrioritizedByRole(prioritized, jsMember);

		const member = store.insertMember({
			guildId: store.guild.id,
			queueId: queue.id,
			userId: jsMember.id,
			message,
			isPrioritized,
		});

		DisplayUtils.requestDisplayUpdate(store, queue.id);

		return member;
	}

	export function updateMembers(store: Store, members: DbMember[] | Collection<bigint, DbMember>, message: string) {
		const updatedMembers = map(members, member => store.updateMember({ ...member, message }));
		DisplayUtils.requestDisplaysUpdate(store, map(updatedMembers, member => member.queueId));
		return updatedMembers;
	}

	/**
	 * Deletes members from the queue(s) and optionally notifies them.
	 * @param options.store - The store to use.
	 * @param options.queues - The queue(s) to delete members from.
	 * @param options.notificationOptions - Optionally notify the deleted members.
	 * @param options.deleteOptions - Optionally specify the members to delete.
	 */
	export function deleteMembers(options: {
		store: Store,
		queues: DbQueue[] | Collection<bigint, DbQueue>,
		by?: MemberDeleteBy,
		notification?: NotificationOptions,
		force?: boolean,
	}) {
		const { store, queues, by, notification, force } = options;
		const deletedMembers: DbMember[] = [];
		const membersToNotify: DbMember[] = [];

		if (by && ("userId" in by || "userIds" in by)) {
			const userIds = ("userId" in by) ? [by.userId] : by.userIds;
			queues.forEach((queue: DbQueue) => {
				const deleted: DbMember[] = [];
				userIds.forEach(userId => {
					const member = store.deleteMember({ queueId: queue.id, userId });
					if (member) deleted.push(member);
				});
				deletedMembers.push(...deleted);
				if (queue.notificationsToggle) {
					membersToNotify.push(...deletedMembers);
				}
			});
		}
		else if (by && "roleId" in by) {
			const jsMembers = store.guild.roles.cache.get(by.roleId).members;
			queues.forEach((queue: DbQueue) => {
				jsMembers.forEach(jsMember => {
					const member = store.deleteMember({ queueId: queue.id, userId: jsMember.id });
					if (member) {
						deletedMembers.push(member);
						if (queue.notificationsToggle) {
							membersToNotify.push(member);
						}
					}
				});
			});
		}
		else {
			queues.forEach((queue: DbQueue) => {
				const deleted: DbMember[] = [];
				const numToPull = get(by, "count") ?? queue.pullBatchSize ?? 1;
				const members = store.dbMembers().filter(member => member.queueId === queue.id);
				if (!force && (members.size < numToPull)) {
					throw new Error("Not enough members to pull (< pullBatchSize of queue).");
				}
				for (let i = 0; i < numToPull; i++) {
					const member = store.deleteMember({ queueId: queue.id });
					if (member) {
						deletedMembers.push(member);
						if (queue.notificationsToggle) {
							membersToNotify.push(...deleted);
						}
					}
				}
			});
		}

		DisplayUtils.requestDisplaysUpdate(store, map(queues, queue => queue.id));

		if (membersToNotify.length && notification) {
			NotificationUtils.notify(store, membersToNotify, notification);
		}

		return deletedMembers;
	}

	export function moveMember(store: Store, queue: DbQueue, member: DbMember, newPosition: number) {
		const members = [...store.dbMembers().filter(member => member.queueId === queue.id).values()];
		const positions = members.map(m => m.positionTime);
		const originalPosition = positions.indexOf(member.positionTime);

		if (originalPosition > newPosition) {
			members.splice(originalPosition, 1);
			members.splice(newPosition, 0, member);
			members.forEach((member, i) =>
				store.updateMember({ ...member, positionTime: positions[i] })
			);
		}
		else if (originalPosition < newPosition) {
			members.splice(originalPosition, 1);
			members.splice(newPosition - 1, 0, member);
			members.forEach((member, i) =>
				store.updateMember({ ...member, positionTime: positions[i] })
			);
		}

		DisplayUtils.requestDisplayUpdate(store, queue.id);

		return members;
	}

	export function clearMembers(store: Store, queue: DbQueue) {
		const members = store.deleteManyMembers({ queueId: queue.id });
		DisplayUtils.requestDisplayUpdate(store, queue.id);
		return members;
	}

	export function shuffleMembers(store: Store, queue: DbQueue) {
		const members = store.dbMembers().filter(member => member.queueId === queue.id);
		const shuffledPositionTimes = members
			.map(member => member.positionTime)
			.sort(() => Math.random() - 0.5);
		members.forEach((member) => store.updateMember({
			...member,
			positionTime: shuffledPositionTimes.pop(),
		}));

		DisplayUtils.requestDisplayUpdate(store, queue.id);
		return members;
	}

	export async function getMemberPositionString(store: Store, queue: DbQueue, userId: Snowflake) {
		const { position, member } = getMemberPosition(store, queue, userId);
		const jsMember = await store.jsMember(userId);
		return new EmbedBuilder()
			.setTitle(queueMention(queue))
			.setColor(queue.color)
			.setDescription(DisplayUtils.createMemberDisplayLine(queue, member, jsMember, position));
	}

	export function formatPulledMemberEmbeds(queues: DbQueue[] | Collection<bigint, DbQueue>, pulledMembers: DbMember[]) {
		const embeds: EmbedBuilder[] = [];
		const grouped = groupBy(pulledMembers, "queueId");
		for (const [queueId, pulledMembers] of Object.entries(grouped)) {
			const queue = find(queues, queue => queue.id === BigInt(queueId));
			const membersStr = pulledMembers.map((member) => userMention(member.userId)).join(", ");
			const description = pulledMembers.length
				? `Pulled ${membersStr} from the '${queueMention(queue)}' queue!`
				: `No members were pulled from the '${queueMention(queue)}' queue`;
			embeds.push(
				new EmbedBuilder()
					.setTitle(queueMention(queue))
					.setColor(queue.color)
					.setDescription(description)
			);
		}
		return embeds;
	}

	export async function getPositions(store: Store, userId: Snowflake) {
		const members = QueryUtils.selectManyMembers({ guildId: store.guild.id, userId });
		const queues = members.map(member => QueryUtils.selectQueue({ guildId: store.guild.id, id: member.queueId }));

		const embeds = await Promise.all(queues.map(queue =>
			MemberUtils.getMemberPositionString(store, queue, userId),
		));

		if (!embeds.length) {
			embeds.push(new EmbedBuilder().setDescription("You are not in any queues."));
		}

		return embeds;
	}

	// ====================================================================
	// 												 Helpers
	// ====================================================================

	function getMemberPosition(store: Store, queue: DbQueue, userId: Snowflake) {
		const members = [...store.dbMembers().filter(member => member.queueId === queue.id).values()];
		const member = members.find(member => member.userId === userId);
		const position = members.indexOf(member) + 1;
		return { position, member };
	}

	function isPrioritizedByUser(prioritized: Collection<bigint, DbPrioritized>, jsMember: GuildMember) {
		return prioritized.some(priority => priority.subjectId === jsMember.id);
	}

	function isPrioritizedByRole(prioritized: Collection<bigint, DbPrioritized>, jsMember: GuildMember) {
		return Array.isArray(jsMember.roles)
			? jsMember.roles.some(roleId => prioritized.some(priority => priority.subjectId === roleId))
			: jsMember.roles.cache.some(role => prioritized.some(priority => priority.subjectId === role.id));
	}
}
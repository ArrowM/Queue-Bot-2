import { Collection, EmbedBuilder, GuildMember, Role, roleMention, type Snowflake, userMention } from "discord.js";
import { groupBy, isNil } from "lodash-es";

import type { Store } from "../core/store.ts";
import { type DbMember, type DbQueue } from "../db/schema.ts";
import { ArchivedMemberReason } from "../types/db.types.ts";
import type { MemberDeleteBy } from "../types/member.types.ts";
import type { NotificationOptions } from "../types/notification.types.ts";
import type { Mentionable } from "../types/parsing.types.ts";
import { BlacklistUtils } from "./blacklist.utils.ts";
import { DisplayUtils } from "./display.utils.ts";
import {
	CustomError,
	NotOnQueueWhitelistError,
	OnQueueBlacklistError,
	QueueFullError,
	QueueLockedError,
} from "./error.utils.ts";
import { find, map } from "./misc.utils.ts";
import { NotificationUtils } from "./notification.utils.ts";
import { PriorityUtils } from "./priority.utils.ts";
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
			verifyMemberEligibility(store, queue, jsMember);
		}

		const priority = PriorityUtils.getMemberPriority(store, queue.id, jsMember);

		const member = store.insertMember({
			guildId: store.guild.id,
			queueId: queue.id,
			userId: jsMember.id,
			message,
			priority,
		});

		await modifyRole(store, jsMember.id, queue.roleId, "add");
		await assignQueueRoleToMember(store, queue, jsMember);

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
	export async function deleteMembers(options: {
		store: Store,
		queues: DbQueue[] | Collection<bigint, DbQueue>,
		reason: ArchivedMemberReason,
		by?: MemberDeleteBy,
		notification?: NotificationOptions,
		force?: boolean,
	}) {
		const { store, queues, reason, by, notification, force } = options;
		const deletedMembers: DbMember[] = [];
		const membersToNotify: DbMember[] = [];
		// @ts-ignore
		const { userId, userIds, roleId, count } = by;

		if (!isNil(userId) || !isNil(userIds)) {
			const ids: Snowflake[] = !isNil(userId) ? [userId] : userIds;
			queues.forEach((queue: DbQueue) => {
				const deleted: DbMember[] = [];
				ids.forEach(userId => {
					const member = store.deleteMember({ queueId: queue.id, userId }, reason);
					if (member) deleted.push(member);
				});
				deletedMembers.push(...deleted);
				if (queue.notificationsToggle) {
					membersToNotify.push(...deletedMembers);
				}
			});
		}
		else if (!isNil(roleId)) {
			const jsMembers = store.guild.roles.cache.get(roleId).members;
			queues.forEach((queue: DbQueue) => {
				jsMembers.forEach(jsMember => {
					const member = store.deleteMember({ queueId: queue.id, userId: jsMember.id }, reason);
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
				const numToPull = count ?? queue.pullBatchSize ?? 1;
				const members = store.dbMembers().filter(member => member.queueId === queue.id);
				if (!force && (members.size < numToPull)) {
					throw new Error("Not enough members to pull (< pullBatchSize of queue).");
				}
				for (let i = 0; i < numToPull; i++) {
					const member = store.deleteMember({ queueId: queue.id }, reason);
					if (member) {
						deletedMembers.push(member);
						if (queue.notificationsToggle) {
							membersToNotify.push(...deleted);
						}
					}
				}
			});
		}

		await Promise.all(
			deletedMembers.map(async (member) => {
				const queue = find(queues, queue => queue.id === member.queueId);
				const jsMember = await store.jsMember(member.userId);
				await removeQueueRoleFromMember(store, queue, jsMember);
			}),
		);

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
				store.updateMember({ ...member, positionTime: positions[i] }),
			);
		}
		else if (originalPosition < newPosition) {
			members.splice(originalPosition, 1);
			members.splice(newPosition - 1, 0, member);
			members.forEach((member, i) =>
				store.updateMember({ ...member, positionTime: positions[i] }),
			);
		}

		DisplayUtils.requestDisplayUpdate(store, queue.id);

		return members;
	}

	export function clearMembers(store: Store, queue: DbQueue) {
		const members = store.deleteManyMembers({ queueId: queue.id }, ArchivedMemberReason.Kicked);
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
					.setDescription(description),
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

	export async function modifyRole(store: Store, memberId: Snowflake, roleId: Snowflake, modification: "add" | "remove") {
		const member = await store.guild.members.fetch(memberId);
		try {
			if (modification === "add") {
				await member.roles.add(roleId);
			}
			else if (modification === "remove") {
				await member.roles.remove(roleId);
			}
		}
		catch (error) {
			throw new CustomError(
				`Can not manage '${roleMention(roleId)}' role.`,
				[new EmbedBuilder().setDescription(`Make sure the bot has the permission to manage '${roleMention(roleId)}' role.`)]
			);
		}
	}

	// ====================================================================
	// 												 Helpers
	// ====================================================================

	function verifyMemberEligibility(store: Store, queue: DbQueue, jsMember: GuildMember) {
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

	async function assignQueueRoleToMember(store: Store, queue: DbQueue, jsMember: GuildMember) {
		if (!queue.roleId) return;
		const role = await store.guild.roles.fetch(queue.roleId);
		if (role) {
			await jsMember.roles.add(role).catch(() => null);
		}
		else {
			// Role deleted, remove from queue
			store.updateQueue({ ...queue, roleId: null });
		}
	}

	async function removeQueueRoleFromMember(store: Store, queue: DbQueue, jsMember: GuildMember) {
		if (!queue.roleId) return;
		const role = await store.guild.roles.fetch(queue.roleId);
		if (role) {
			await jsMember.roles.remove(role).catch(() => null);
		}
		else {
			// Role deleted, remove from queue
			store.updateQueue({ ...queue, roleId: null });
		}
	}

	function getMemberPosition(store: Store, queue: DbQueue, userId: Snowflake) {
		const members = [...store.dbMembers().filter(member => member.queueId === queue.id).values()];
		const member = members.find(member => member.userId === userId);
		const position = members.indexOf(member) + 1;
		return { position, member };
	}
}

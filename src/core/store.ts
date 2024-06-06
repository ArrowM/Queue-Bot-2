import { type DiscordAPIError, Guild, type GuildBasedChannel, type GuildMember, type Snowflake } from "discord.js";
import { and, eq, isNull, or } from "drizzle-orm";
import { compact, isNil } from "lodash-es";
import moize from "moize";

import { db, incrementGuildStat } from "../db/db.ts";
import {
	ADMIN_TABLE,
	ARCHIVED_MEMBER_TABLE,
	BLACKLISTED_TABLE,
	type DbAdmin,
	type DbArchivedMember,
	type DbBlacklisted,
	type DbDisplay,
	type DbMember,
	type DbPrioritized,
	type DbQueue,
	type DbSchedule,
	type DbWhitelisted,
	DISPLAY_TABLE,
	GUILD_TABLE,
	MEMBER_TABLE,
	type NewAdmin,
	type NewArchivedMember,
	type NewBlacklisted,
	type NewDisplay,
	type NewGuild,
	type NewMember,
	type NewPrioritized,
	type NewQueue,
	type NewSchedule,
	type NewWhitelisted,
	PRIORITIZED_TABLE,
	QUEUE_TABLE,
	SCHEDULE_TABLE,
	WHITELISTED_TABLE,
} from "../db/schema.ts";
import { ArchivedMemberReason, type GuildStat } from "../types/db.types.ts";
import {
	AdminAlreadyExistsError,
	BlacklistedAlreadyExistsError,
	PrioritizedAlreadyExistsError,
	QueueAlreadyExistsError,
	ScheduleAlreadyExistsError,
	WhitelistedAlreadyExistsError,
} from "../utils/error.utils.ts";
import { MemberUtils } from "../utils/member.utils.ts";
import { toCollection } from "../utils/misc.utils.ts";
import { QueryUtils } from "../utils/query.utils.ts";
import deleteMembers = MemberUtils.deleteMembers;

/**
 * The `Store` class is responsible for all database operations initiated by users, including insert, update, and delete operations.
 * Select queries are encapsulated in `query.utils.ts` to promote code reusability across different parts of the application.
 *
 * ⚠️ IMPORTANT ⚠️: Queries must be written to include guildId!
 */
export class Store {

	constructor(
		public guild: Guild,
		public initiator?: GuildMember,
	) {
	}

	// ====================================================================
	//                           Common data
	// ====================================================================

	dbQueues = moize(() => toCollection<bigint, DbQueue>("id", QueryUtils.selectManyQueues({ guildId: this.guild.id })));
	dbDisplays = moize(() => toCollection<bigint, DbDisplay>("id", QueryUtils.selectManyDisplays({ guildId: this.guild.id })));
	// DbMembers is ordered by positionTime
	dbMembers = moize(() => toCollection<bigint, DbMember>("id", QueryUtils.selectManyMembers({ guildId: this.guild.id })));
	dbSchedules = moize(() => toCollection<bigint, DbSchedule>("id", QueryUtils.selectManySchedules({ guildId: this.guild.id })));
	dbWhitelisted = moize(() => toCollection<bigint, DbWhitelisted>("id", QueryUtils.selectManyWhitelisted({ guildId: this.guild.id })));
	dbBlacklisted = moize(() => toCollection<bigint, DbBlacklisted>("id", QueryUtils.selectManyBlacklisted({ guildId: this.guild.id })));
	dbPrioritized = moize(() => toCollection<bigint, DbPrioritized>("id", QueryUtils.selectManyPrioritized({ guildId: this.guild.id })));
	dbAdmins = moize(() => toCollection<bigint, DbAdmin>("id", QueryUtils.selectManyAdmins({ guildId: this.guild.id })));
	// dbArchivedMembers is unordered
	dbArchivedMembers = moize(() => toCollection<bigint, DbArchivedMember>("id", QueryUtils.selectManyArchivedMembers({ guildId: this.guild.id })));

	// ====================================================================
	//                           Discord.js
	// ====================================================================

	async jsChannel(channelId: Snowflake) {
		try {
			return await this.guild.channels.fetch(channelId);
		}
		catch (_e) {
			const e = _e as DiscordAPIError;
			if (e.status == 404) {
				this.deleteManyDisplays({ displayChannelId: channelId });
			}
		}
	}

	async jsMember(userId: Snowflake) {
		try {
			return await this.guild.members.fetch(userId);
		}
		catch (_e) {
			const e = _e as DiscordAPIError;
			if (e.status == 404) {
				this.deleteManyMembers({ userId }, ArchivedMemberReason.NotFound);
			}
		}
	}

	async jsChannels(channelIds: Snowflake[]) {
		return toCollection<Snowflake, GuildBasedChannel>("id",
			compact(await Promise.all(channelIds.map(id => this.jsChannel(id)))),
		);
	}

	async jsMembers(userIds: Snowflake[]) {
		return toCollection<Snowflake, GuildMember>("id",
			compact(await Promise.all(userIds.map(id => this.jsMember(id)))),
		);
	}

	// ====================================================================
	//                           Inserts
	// ====================================================================

	incrementGuildStat(stat: GuildStat, by = 1) {
		// Ensure the guild is in the database
		this.insertGuild({ guildId: this.guild.id });
		incrementGuildStat(this.guild.id, stat, by);
	}

	insertGuild(dbGuild: NewGuild) {
		return db
			.insert(GUILD_TABLE)
			.values(dbGuild)
			.onConflictDoNothing()
			.returning().get();
	}

	// throws error on conflict
	insertQueue(newQueue: NewQueue) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("queuesAdded");
				this.dbQueues.clear();
				return db
					.insert(QUEUE_TABLE)
					.values(newQueue)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new QueueAlreadyExistsError();
			}
		}
	}

	// replace on conflict
	insertDisplay(newDisplay: NewDisplay) {
		return db.transaction(() => {
			this.incrementGuildStat("displaysAdded");
			this.dbDisplays.clear();
			return db
				.insert(DISPLAY_TABLE)
				.values(newDisplay)
				.onConflictDoUpdate({
					target: [DISPLAY_TABLE.queueId, DISPLAY_TABLE.displayChannelId],
					set: newDisplay,
				})
				.returning().get();
		});
	}

	// replace on conflict
	insertMember(newMember: NewMember) {
		return db.transaction(() => {
			this.incrementGuildStat("membersAdded");
			this.dbMembers.clear();
			return db
				.insert(MEMBER_TABLE)
				.values(newMember)
				.onConflictDoUpdate({
					target: [MEMBER_TABLE.queueId, MEMBER_TABLE.userId],
					set: newMember,
				})
				.returning().get();
		});
	}

	// throws error on conflict
	insertSchedule(newSchedule: NewSchedule) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("schedulesAdded");
				this.dbSchedules.clear();
				return db
					.insert(SCHEDULE_TABLE)
					.values(newSchedule)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new ScheduleAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertWhitelisted(newWhitelisted: NewWhitelisted) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("whitelistedAdded");
				this.dbWhitelisted.clear();
				return db
					.insert(WHITELISTED_TABLE)
					.values(newWhitelisted)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new WhitelistedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertBlacklisted(newBlacklisted: NewBlacklisted) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("blacklistedAdded");
				this.dbBlacklisted.clear();
				return db
					.insert(BLACKLISTED_TABLE)
					.values(newBlacklisted)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new BlacklistedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertPrioritized(newPrioritized: NewPrioritized) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("prioritizedAdded");
				this.dbPrioritized.clear();
				return db
					.insert(PRIORITIZED_TABLE)
					.values(newPrioritized)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new PrioritizedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertAdmin(newAdmin: NewAdmin) {
		try {
			return db.transaction(() => {
				this.incrementGuildStat("adminsAdded");
				this.dbAdmins.clear();
				return db
					.insert(ADMIN_TABLE)
					.values(newAdmin)
					.returning().get();
			});
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new AdminAlreadyExistsError();
			}
		}
	}

	// replace on conflict
	insertArchivedMember(newArchivedMember: NewArchivedMember) {
		return db.transaction(() => {
			this.incrementGuildStat("archivedMembersAdded");
			this.dbArchivedMembers.clear();
			return db
				.insert(ARCHIVED_MEMBER_TABLE)
				.values({ ...newArchivedMember, archivedTime: BigInt(Date.now()) })
				.onConflictDoUpdate({
					target: [ARCHIVED_MEMBER_TABLE.queueId, ARCHIVED_MEMBER_TABLE.userId],
					set: newArchivedMember,
				})
				.returning().get();
		});
	}

	// ====================================================================
	//                      Condition helper
	// ====================================================================

	/**
	 * Creates a condition for a query based on the provided parameters.
	 * If there is more than one parameter, the condition will be an `AND` condition.
	 * @param table - The table to create the condition for.
	 * @param params - The parameters to create the condition with.
	 */
	private createCondition(table: any, params: { [key: string]: any }) {
		function createSingleCondition(key: string) {
			const col = table[key];
			const value = params[key];
			return isNil(value) ? isNull(col) : eq(col, value);
		}

		// Add guildId to the params
		params.guildId = this.guild.id;

		if (Object.keys(params).length > 1) {
			return and(...Object.keys(params).map(createSingleCondition));
		}
		else {
			return createSingleCondition(Object.keys(params)[0]);
		}
	}

	// ====================================================================
	//                           Updates
	// ====================================================================

	// Updates

	updateQueue(queue: { id: bigint } & Partial<DbQueue>) {
		this.dbQueues.clear();
		return db
			.update(QUEUE_TABLE)
			.set(queue)
			.where(and(
				eq(QUEUE_TABLE.id, queue.id),
				eq(QUEUE_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updateDisplay(display: { id: bigint } & Partial<DbDisplay>) {
		this.dbDisplays.clear();
		return db
			.update(DISPLAY_TABLE)
			.set(display)
			.where(and(
				eq(DISPLAY_TABLE.id, display.id),
				eq(DISPLAY_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updateMember(member: { id: bigint } & Partial<DbMember>) {
		this.dbMembers.clear();
		return db
			.update(MEMBER_TABLE)
			.set(member)
			.where(and(
				eq(MEMBER_TABLE.id, member.id),
				eq(MEMBER_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updateSchedule(schedule: { id: bigint } & Partial<DbSchedule>) {
		this.dbSchedules.clear();
		return db
			.update(SCHEDULE_TABLE)
			.set(schedule)
			.where(and(
				eq(SCHEDULE_TABLE.id, schedule.id),
				eq(SCHEDULE_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updateWhitelisted(whitelisted: { id: bigint } & Partial<DbWhitelisted>) {
		this.dbWhitelisted.clear();
		return db
			.update(WHITELISTED_TABLE)
			.set(whitelisted)
			.where(and(
				eq(WHITELISTED_TABLE.id, whitelisted.id),
				eq(WHITELISTED_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updateBlacklisted(blacklisted: { id: bigint } & Partial<DbBlacklisted>) {
		this.dbBlacklisted.clear();
		return db
			.update(BLACKLISTED_TABLE)
			.set(blacklisted)
			.where(and(
				eq(BLACKLISTED_TABLE.id, blacklisted.id),
				eq(BLACKLISTED_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	updatePrioritized(prioritized: { id: bigint } & Partial<DbPrioritized>) {
		this.dbPrioritized.clear();
		return db
			.update(PRIORITIZED_TABLE)
			.set(prioritized)
			.where(and(
				eq(PRIORITIZED_TABLE.id, prioritized.id),
				eq(PRIORITIZED_TABLE.guildId, this.guild.id),
			))
			.returning().get();
	}

	// Deletes

	deleteQueue(by: { id: bigint }) {
		this.dbQueues.clear();
		const cond = this.createCondition(QUEUE_TABLE, by);
		return db.delete(QUEUE_TABLE).where(cond).returning().get();
	}

	deleteManyQueues() {
		this.dbQueues.clear();
		const cond = this.createCondition(QUEUE_TABLE, {});
		return db.delete(QUEUE_TABLE).where(cond).returning().all();
	}

	deleteDisplay(by:
		{ id: bigint } |
		{ lastMessageId: Snowflake } |
		{ queueId: bigint, displayChannelId: Snowflake },
	) {
		this.dbDisplays.clear();
		const cond = this.createCondition(DISPLAY_TABLE, by);
		return db.delete(DISPLAY_TABLE).where(cond).returning().get();
	}

	deleteManyDisplays(by:
		{ queueId?: bigint } |
		{ displayChannelId?: Snowflake },
	) {
		this.dbDisplays.clear();
		const cond = this.createCondition(DISPLAY_TABLE, by);
		return db.delete(DISPLAY_TABLE).where(cond).returning().all();
	}

	deleteMember(by:
			{ id: bigint } |
			{ queueId: bigint, userId?: Snowflake },
	reason: ArchivedMemberReason,
	) {
		this.dbMembers.clear();
		const cond = this.createCondition(MEMBER_TABLE, by);
		const deletedMember = db.delete(MEMBER_TABLE).where(cond).returning().get();

		if (deletedMember) {
			this.insertArchivedMember({ ...deletedMember, reason });
		}

		return deletedMember;
	}

	deleteManyMembers(by:
			{ userId?: Snowflake } |
			{ queueId: bigint, count?: number },
	reason: ArchivedMemberReason,
	) {
		this.dbMembers.clear();
		const cond = ("count" in by)
			? or(...QueryUtils.selectManyMembers({
				...by,
				guildId: this.guild.id,
			}).map(member => eq(MEMBER_TABLE.id, member.id)))
			: this.createCondition(MEMBER_TABLE, by);
		const deletedMembers = db.delete(MEMBER_TABLE).where(cond).returning().all();

		deletedMembers.forEach(deletedMember =>
			this.insertArchivedMember({ ...deletedMember, reason }),
		);

		return deleteMembers;
	}

	deleteSchedule(by: { id: bigint }) {
		this.dbSchedules.clear();
		const cond = this.createCondition(SCHEDULE_TABLE, by);
		return db.delete(SCHEDULE_TABLE).where(cond).returning().get();
	}

	deleteManySchedules() {
		this.dbSchedules.clear();
		const cond = this.createCondition(SCHEDULE_TABLE, {});
		return db.delete(SCHEDULE_TABLE).where(cond).returning().all();
	}

	deleteWhitelisted(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: bigint },
	) {
		this.dbWhitelisted.clear();
		const cond = this.createCondition(WHITELISTED_TABLE, by);
		return db.delete(WHITELISTED_TABLE).where(cond).returning().get();
	}

	deleteManyWhitelisted(by:
		{ subjectId?: Snowflake } |
		{ queueId: bigint },
	) {
		this.dbWhitelisted.clear();
		const cond = this.createCondition(WHITELISTED_TABLE, by);
		return db.delete(WHITELISTED_TABLE).where(cond).returning().all();
	}

	deleteBlacklisted(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: Snowflake },
	) {
		this.dbBlacklisted.clear();
		const cond = this.createCondition(BLACKLISTED_TABLE, by);
		return db.delete(BLACKLISTED_TABLE).where(cond).returning().get();
	}

	deleteManyBlacklisted(by:
		{ subjectId?: Snowflake } |
		{ queueId: bigint },
	) {
		this.dbBlacklisted.clear();
		const cond = this.createCondition(BLACKLISTED_TABLE, by);
		return db.delete(BLACKLISTED_TABLE).where(cond).returning().get();
	}

	deletePrioritized(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: bigint },
	) {
		this.dbPrioritized.clear();
		const cond = this.createCondition(PRIORITIZED_TABLE, by);
		return db.delete(PRIORITIZED_TABLE).where(cond).returning().get();
	}

	deleteManyPrioritized(by:
		{ subjectId?: Snowflake } |
		{ queueId: bigint },
	) {
		this.dbPrioritized.clear();
		const cond = this.createCondition(PRIORITIZED_TABLE, by);
		return db.delete(PRIORITIZED_TABLE).where(cond).returning().get();
	}

	deleteAdmin(by:
		{ id: bigint } |
		{ subjectId: Snowflake },
	) {
		this.dbAdmins.clear();
		const cond = this.createCondition(ADMIN_TABLE, by);
		return db.delete(ADMIN_TABLE).where(cond).returning().get();
	}

	deleteManyAdmins() {
		this.dbAdmins.clear();
		const cond = this.createCondition(ADMIN_TABLE, {});
		return db.delete(ADMIN_TABLE).where(cond).returning().get();
	}
}

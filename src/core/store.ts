import { type DiscordAPIError, Guild, type GuildBasedChannel, type GuildMember, type Snowflake } from "discord.js";
import { and, eq, isNull, or } from "drizzle-orm";
import { compact, isNil } from "lodash-es";
import moize from "moize";

import { db } from "../db/db.ts";
import {
	ADMINS_TABLE,
	BLACKLISTED_TABLE,
	type DbAdmin,
	type DbBlacklisted,
	type DbDisplay,
	type DbMember,
	type DbPrioritized,
	type DbQueue,
	type DbSchedule,
	type DbWhitelisted,
	DISPLAYS_TABLE,
	MEMBERS_TABLE,
	type NewAdmin,
	type NewBlacklisted,
	type NewDisplay,
	type NewMember,
	type NewPrioritized,
	type NewQueue,
	type NewSchedule,
	type NewWhitelisted,
	PRIORITIZED_TABLE,
	QUEUES_TABLE,
	SCHEDULES_TABLE,
	WHITELISTED_TABLE,
} from "../db/schema.ts";
import {
	AdminAlreadyExistsError,
	BlacklistedAlreadyExistsError, PrioritizedAlreadyExistsError,
	QueueAlreadyExistsError,
	ScheduleAlreadyExistsError,
	WhitelistedAlreadyExistsError,
} from "../utils/error.utils.ts";
import { toCollection } from "../utils/misc.utils.ts";
import { QueryUtils } from "../utils/query.utils.ts";

/**
 * The `Store` class is responsible for all database operations initiated by users, including insert, update, and delete operations.
 * Select queries are encapsulated in `query.utils.ts` to promote code reusability across different parts of the application.
 */
export class Store {

	/**
	 * ====================================================================
	 *                         ⚠️ IMPORTANT ⚠️
	 * ====================================================================
	 *
	 * Queries MUST be written to only effect a single guild:
	 * User ids are global, so they must be used in conjunction with another guild-specific identifier.
	 *
	 * ✅ by id of a table
	 * ✅ by guildId
	 * ✅ by queueId
	 * ✅ by channelId
	 * ✅ by messageId
	 * ✅ by roleId
	 * ✅ by userId + guildId
	 * ✅ by subjectId + guildId
	 * ❌ by userId
	 * ❌ by subjectId
	 */

	constructor(public guild: Guild) {
		const dbGuild = this.dbGuild();
		if (!dbGuild) {
			QueryUtils.insertGuild({ guildId: guild.id });
		}
	}

	// ====================================================================
	//                           Common data
	// ====================================================================

	dbGuild = moize(() => QueryUtils.selectGuild({ guildId: this.guild.id }));
	dbQueues = moize(() => toCollection<bigint, DbQueue>("id", QueryUtils.selectManyQueues({ guildId: this.guild.id })));
	dbDisplays = moize(() => toCollection<bigint, DbDisplay>("id", QueryUtils.selectManyDisplays({ guildId: this.guild.id })));
	// DbMembers is ordered by positionTime
	dbMembers = moize(() => toCollection<bigint, DbMember>("id", QueryUtils.selectManyMembers({ guildId: this.guild.id })));
	dbSchedules = moize(() => toCollection<bigint, DbSchedule>("id", QueryUtils.selectManySchedules({ guildId: this.guild.id })));
	dbWhitelisted = moize(() => toCollection<bigint, DbWhitelisted>("id", QueryUtils.selectManyWhitelisted({ guildId: this.guild.id })));
	dbBlacklisted = moize(() => toCollection<bigint, DbBlacklisted>("id", QueryUtils.selectManyBlacklisted({ guildId: this.guild.id })));
	dbPrioritized = moize(() => toCollection<bigint, DbPrioritized>("id", QueryUtils.selectManyPrioritized({ guildId: this.guild.id })));
	dbAdmins = moize(() => toCollection<bigint, DbAdmin>("id", QueryUtils.selectManyAdmins({ guildId: this.guild.id })));

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
				this.deleteManyMembers({ guildId: this.guild.id, userId });
			}
		}
	}

	async jsChannels(channelIds: Snowflake[]) {
		return toCollection<Snowflake, GuildBasedChannel>("id",
			compact(await Promise.all(channelIds.map(id => this.jsChannel(id))))
		);
	}

	async jsMembers(userIds: Snowflake[]) {
		return toCollection<Snowflake, GuildMember>("id",
			compact(await Promise.all(userIds.map(id => this.jsMember(id))))
		);
	}

	// ====================================================================
	//                           Inserts
	// ====================================================================

	// throws error on conflict
	insertQueue(newQueue: NewQueue) {
		this.dbQueues.clear();
		try {
			return db
				.insert(QUEUES_TABLE)
				.values(newQueue)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new QueueAlreadyExistsError();
			}
		}
	}

	// replace on conflict
	insertDisplay(newDisplay: NewDisplay) {
		this.dbDisplays.clear();
		return db
			.insert(DISPLAYS_TABLE)
			.values(newDisplay)
			.onConflictDoUpdate({
				target: [DISPLAYS_TABLE.queueId, DISPLAYS_TABLE.displayChannelId],
				set: newDisplay,
			})
			.returning().get();
	}

	// conflicts must be handled by the caller
	insertMember(newMember: NewMember) {
		this.dbMembers.clear();
		return db
			.insert(MEMBERS_TABLE)
			.values(newMember)
			.onConflictDoUpdate({
				target: [MEMBERS_TABLE.queueId, MEMBERS_TABLE.userId],
				set: newMember,
			})
			.returning().get();
	}

	// throws error on conflict
	insertSchedule(newSchedule: NewSchedule) {
		this.dbSchedules.clear();
		try {
			return db
				.insert(SCHEDULES_TABLE)
				.values(newSchedule)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new ScheduleAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertWhitelisted(newWhitelisted: NewWhitelisted) {
		this.dbWhitelisted.clear();
		try {
			return db
				.insert(WHITELISTED_TABLE)
				.values(newWhitelisted)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new WhitelistedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertBlacklisted(newBlacklisted: NewBlacklisted) {
		this.dbBlacklisted.clear();
		try {
			return db
				.insert(BLACKLISTED_TABLE)
				.values(newBlacklisted)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new BlacklistedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertPrioritized(newPrioritized: NewPrioritized) {
		this.dbPrioritized.clear();
		try {
			return db
				.insert(PRIORITIZED_TABLE)
				.values(newPrioritized)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new PrioritizedAlreadyExistsError();
			}
		}
	}

	// throws error on conflict
	insertAdmin(newAdmin: NewAdmin) {
		this.dbAdmins.clear();
		try {
			return db
				.insert(ADMINS_TABLE)
				.values(newAdmin)
				.returning().get();
		}
		catch (e) {
			if ((e as Error).message.includes("UNIQUE constraint failed")) {
				throw new AdminAlreadyExistsError();
			}
		}
	}

	// ====================================================================
	//                           Updates
	// ====================================================================

	updateQueue(queue: Partial<DbQueue> & { id: bigint }) {
		this.dbQueues.clear();
		return db
			.update(QUEUES_TABLE)
			.set(queue)
			.where(
				eq(QUEUES_TABLE.id, queue.id),
			)
			.returning().get();
	}

	updateDisplay(display: Partial<DbDisplay> & { id: bigint }) {
		this.dbDisplays.clear();
		return db
			.update(DISPLAYS_TABLE)
			.set(display)
			.where(and(
				eq(DISPLAYS_TABLE.id, display.id),
			))
			.returning().get();
	}

	updateMember(member: Partial<DbMember> & { id: bigint }) {
		this.dbMembers.clear();
		return db
			.update(MEMBERS_TABLE)
			.set(member)
			.where(and(
				eq(MEMBERS_TABLE.id, member.id),
			))
			.returning().get();
	}

	updateSchedule(schedule: Partial<DbSchedule> & { id: bigint }) {
		this.dbSchedules.clear();
		return db
			.update(SCHEDULES_TABLE)
			.set(schedule)
			.where(
				eq(SCHEDULES_TABLE.id, schedule.id),
			)
			.returning().get();
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
	private createCondition(table: any, params: { [key: string]: any}) {
		function createSingleCondition(key: string) {
			const col = table[key];
			const value = params[key];
			return isNil(value) ? isNull(col) : eq(col, value);
		}
		if (Object.keys(params).length > 1) {
			return and(...Object.keys(params).map(createSingleCondition));
		}
		else {
			return createSingleCondition(Object.keys(params)[0]);
		}
	}

	// ====================================================================
	//                           Deletes
	// ====================================================================

	deleteQueue(by: { id: bigint }) {
		this.dbQueues.clear();
		const cond = this.createCondition(QUEUES_TABLE, by);
		return db.delete(QUEUES_TABLE).where(cond).returning().get();
	}

	deleteManyQueues(by: { guildId: Snowflake }) {
		this.dbQueues.clear();
		const cond = this.createCondition(QUEUES_TABLE, by);
		return db.delete(QUEUES_TABLE).where(cond).returning().all();
	}

	deleteDisplay(by:
		{ id: bigint } |
		{ lastMessageId: Snowflake } |
		{ queueId: bigint, displayChannelId: Snowflake },
	) {
		this.dbDisplays.clear();
		const cond = this.createCondition(DISPLAYS_TABLE, by);
		return db.delete(DISPLAYS_TABLE).where(cond).returning().get();
	}

	deleteManyDisplays(by:
		{ guildId: bigint } |
		{ queueId: bigint } |
		{ displayChannelId: Snowflake }
	) {
		this.dbDisplays.clear();
		const cond = this.createCondition(DISPLAYS_TABLE, by);
		return db.delete(DISPLAYS_TABLE).where(cond).returning().all();
	}

	deleteMember(by:
		{ id: bigint } |
		{ queueId: bigint, userId?: Snowflake },
	) {
		this.dbMembers.clear();
		const cond = this.createCondition(MEMBERS_TABLE, by);
		return db.delete(MEMBERS_TABLE).where(cond).returning().get();
	}

	deleteManyMembers(by:
		{ guildId: Snowflake, userId?: Snowflake } |
		{ queueId: bigint, count?: number }
	) {
		this.dbMembers.clear();
		const cond = ("count" in by)
			? or(...QueryUtils.selectManyMembers(by).map(member => eq(MEMBERS_TABLE.id, member.id)))
		  : this.createCondition(MEMBERS_TABLE, by);
		return db.delete(MEMBERS_TABLE).where(cond).returning().all();
	}

	deleteSchedule(by: { id: bigint }) {
		this.dbSchedules.clear();
		const cond = this.createCondition(SCHEDULES_TABLE, by);
		return db.delete(SCHEDULES_TABLE).where(cond).returning().get();
	}

	deleteManySchedules(by:
		{ guildId: Snowflake } |
		{ queueId: bigint }
	) {
		this.dbSchedules.clear();
		const cond = this.createCondition(SCHEDULES_TABLE, by);
		return db.delete(SCHEDULES_TABLE).where(cond).returning().all();
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
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
	) {
		this.dbWhitelisted.clear();
		const cond = this.createCondition(WHITELISTED_TABLE, by);
		return db.delete(WHITELISTED_TABLE).where(cond).returning().all();
	}

	deleteBlacklisted(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: Snowflake }
	) {
		this.dbBlacklisted.clear();
		const cond = this.createCondition(BLACKLISTED_TABLE, by);
		return db.delete(BLACKLISTED_TABLE).where(cond).returning().get();
	}

	deleteManyBlacklisted(by:
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
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
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
	) {
		this.dbPrioritized.clear();
		const cond = this.createCondition(PRIORITIZED_TABLE, by);
		return db.delete(PRIORITIZED_TABLE).where(cond).returning().get();
	}

	deleteAdmin(by:
		{ id: bigint } |
		{ guildId: Snowflake, subjectId: Snowflake },
	) {
		this.dbAdmins.clear();
		const cond = this.createCondition(ADMINS_TABLE, by);
		return db.delete(ADMINS_TABLE).where(cond).returning().get();
	}

	deleteManyAdmin(by:
		{ subjectId: Snowflake } |
		{ guildId: Snowflake }
	) {
		this.dbAdmins.clear();
		const cond = this.createCondition(ADMINS_TABLE, by);
		return db.delete(ADMINS_TABLE).where(cond).returning().get();
	}
}

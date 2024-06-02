import type { Snowflake } from "discord.js";
import { and, eq, sql } from "drizzle-orm";

import { db } from "../db/db.ts";
import {
	ADMINS_TABLE,
	BLACKLISTED_TABLE,
	DISPLAYS_TABLE,
	GUILDS_TABLE,
	MEMBERS_TABLE,
	PRIORITIZED_TABLE,
	QUEUES_TABLE,
	SCHEDULES_TABLE,
	WHITELISTED_TABLE,
} from "../db/schema.ts";

/**
 * `QueryUtils` is responsible for handling all database read operations, including select queries.
 * These operations do not modify the database but are used to retrieve data.
 * All database write operations (insert, update, delete) are handled in `store.ts` to ensure they update the cache.
 */
export namespace QueryUtils {

	/**
	 * ====================================================================
	 *                         ⚠️ IMPORTANT ⚠️
	 * ====================================================================
	 *
	 * Queries MUST be written to only effect a single guild.
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

	// ====================================================================
	//                           Queries
	// ====================================================================

	/**
	 * Note: we use prepared statements wherever possible...
	 * so `createCondition()` used in `store.ts` can't be used to condense this code.
	 */

	// Guilds

	export function selectGuild(by: { guildId: Snowflake }) {
		return selectGuildById.get(by);
	}

	export function deleteGuild(by: { guildId: Snowflake }) {
		return db
			.delete(GUILDS_TABLE)
			.where(
				eq(GUILDS_TABLE.guildId, by.guildId)
			)
			.returning().get();
	}

	// Queues

	export function selectQueue(by: { id: bigint }) {
		return selectQueueById.get(by);
	}

	export function selectManyQueues(by: { guildId: Snowflake }) {
		return selectManyQueuesByGuildId.all(by);
	}

	// Displays

	export function selectDisplay(by:
		{ id: bigint } |
		{ lastMessageId: Snowflake } |
		{ queueId: bigint, displayChannelId: Snowflake }
	) {
		if ("id" in by) {
			return selectDisplayById.get(by);
		}
		else if ("lastMessageId" in by) {
			return selectDisplayByLastMessageId.get(by);
		}
		else if ("queueId" in by && "displayChannelId" in by) {
			return selectDisplayByQueueIdAndDisplayChannelId.get(by);
		}
	}

	export function selectManyDisplays(by:
		{ guildId: Snowflake } |
		{ queueId: bigint } |
		{ displayChannelId: Snowflake }
	) {
		if ("guildId" in by) {
			return selectManyDisplaysByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManyDisplaysByQueueId.all(by);
		}
		else if ("displayChannelId" in by) {
			return selectManyDisplaysByDisplayChannelId.all(by);
		}
	}

	// Members

	export function selectMember(by:
		{ id: bigint } |
		{ queueId: bigint, userId?: Snowflake }
	) {
		if ("id" in by) {
			return selectMemberById.get(by);
		}
		else if ("queueId" in by && "userId" in by) {
			return selectMemberByQueueIdAndUserId.get(by);
		}
		else if ("queueId" in by) {
			return selectNextMemberByQueue.get(by);
		}
	}

	/**
	 * Selects members in position order
	 */
	export function selectManyMembers(by:
		{ guildId: Snowflake, userId?: Snowflake } |
		{ queueId: bigint, count?: number }
	) {
		if ("guildId" in by && "userId" in by) {
			return selectManyMembersByGuildIdAndUserId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyMembersByGuildId.all(by);
		}
		else if ("queueId" in by && "count" in by) {
			return selectManyMembersByQueueIdAndCount.all(by);
		}
		else if ("queueId" in by) {
			return selectManyMembersByQueueId.all(by);
		}
	}

	// Schedules

	export function selectSchedule(by: { id: bigint }) {
		return selectScheduleById.get(by);
	}

	export function selectManySchedules(by:
		{ guildId: Snowflake } |
		{ queueId: bigint }
	) {
		if ("guildId" in by) {
			return selectManySchedulesByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManySchedulesByQueueId.all(by);
		}
	}

	// Needed for startup schedule load
	export function selectAllSchedules() {
		return db
			.select()
			.from(SCHEDULES_TABLE)
			.all();
	}

	export function deleteSchedule(by: { id: bigint }) {
		return db
			.delete(SCHEDULES_TABLE)
			.where(
				eq(SCHEDULES_TABLE.id, by.id),
			)
			.returning().get();
	}

	// Whitelisted

	export function selectWhitelisted(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: Snowflake }
	) {
		if ("id" in by) {
			return selectWhitelistedById.get(by);
		}
		else if ("queueId" in by && "subjectId" in by) {
			return selectWhitelistedByQueueIdAndSubjectId.get(by);
		}
	}

	export function selectManyWhitelisted(by:
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
	) {
		if ("guildId" in by && "subjectId" in by) {
			return selectManyWhitelistedByGuildIdAndSubjectId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyWhitelistedByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManyWhitelistedByQueueId.all(by);
		}
	}

	// Blacklisted

	export function selectBlacklisted(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: Snowflake }
	) {
		if ("id" in by) {
			return selectBlacklistedById.get(by);
		}
		else if ("queueId" in by && "subjectId" in by) {
			return selectBlacklistedByQueueIdAndSubjectId.get(by);
		}
	}

	export function selectManyBlacklisted(by:
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
	) {
		if ("guildId" in by && "subjectId" in by) {
			return selectManyBlacklistedByGuildIdAndSubjectId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyBlacklistedByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManyBlacklistedByQueueId.all(by);
		}
	}

	// Prioritized

	export function selectPrioritized(by:
		{ id: bigint } |
		{ queueId: bigint, subjectId: Snowflake }
	) {
		if ("id" in by) {
			return selectPrioritizedById.get(by);
		}
		else if ("queueId" in by && "subjectId" in by) {
			return selectPrioritizedByQueueIdAndSubjectId.get(by);
		}
	}

	export function selectManyPrioritized(by:
		{ guildId: Snowflake, subjectId?: Snowflake } |
		{ queueId: bigint }
	) {
		if ("guildId" in by && "subjectId" in by) {
			return selectManyPrioritizedByGuildIdAndSubjectId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyPrioritizedByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManyPrioritizedByQueueId.all(by);
		}
	}

	// Admins

	export function selectAdmin(by:
		{ id: bigint } |
		{ guildId: Snowflake, subjectId: Snowflake }
	) {
		if ("id" in by) {
			return selectAdminById.get(by);
		}
		else if ("guildId" in by && "subjectId" in by) {
			return selectAdminByGuildIdAndSubjectId.get(by);
		}
	}

	export function selectManyAdmins(by:
		{ subjectId: Snowflake } |
		{ guildId: Snowflake }
	) {
		if ("subjectId" in by) {
			return selectManyAdminsBySubjectId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyAdminsByGuildId.all(by);
		}
	}

	// ====================================================================
	//                           Prepared Selects
	// ====================================================================

	// Guilds

	const selectGuildById = db
		.select()
		.from(GUILDS_TABLE)
		.where(
			eq(GUILDS_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Queues

	const selectQueueById = db
		.select()
		.from(QUEUES_TABLE)
		.where(
			eq(QUEUES_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectManyQueuesByGuildId = db
		.select()
		.from(QUEUES_TABLE)
		.where(
			eq(QUEUES_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Displays

	const selectDisplayById = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(
			eq(DISPLAYS_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectDisplayByLastMessageId = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(
			eq(DISPLAYS_TABLE.lastMessageId, sql.placeholder("lastMessageId")),
		)
		.prepare();

	const selectDisplayByQueueIdAndDisplayChannelId = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(and(
			eq(DISPLAYS_TABLE.queueId, sql.placeholder("queueId")),
			eq(DISPLAYS_TABLE.displayChannelId, sql.placeholder("displayChannelId")),
		))
		.prepare();

	const selectManyDisplaysByGuildId = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(
			eq(DISPLAYS_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyDisplaysByQueueId = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(
			eq(DISPLAYS_TABLE.queueId, sql.placeholder("queueId")),
		)
		.prepare();

	const selectManyDisplaysByDisplayChannelId = db
		.select()
		.from(DISPLAYS_TABLE)
		.where(
			eq(DISPLAYS_TABLE.displayChannelId, sql.placeholder("displayChannelId")),
		)
		.prepare();

	// Members

	const selectMemberById = db
		.select()
		.from(MEMBERS_TABLE)
		.where(
			eq(MEMBERS_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectMemberByQueueIdAndUserId = db
		.select()
		.from(MEMBERS_TABLE)
		.where(and(
			eq(MEMBERS_TABLE.queueId, sql.placeholder("queueId")),
			eq(MEMBERS_TABLE.userId, sql.placeholder("userId")),
		))
		.prepare();

	const selectNextMemberByQueue = db
		.select()
		.from(MEMBERS_TABLE)
		.where(
			eq(MEMBERS_TABLE.queueId, sql.placeholder("queueId")),
		)
		.orderBy(MEMBERS_TABLE.isPrioritized, MEMBERS_TABLE.positionTime)
		.prepare();

	const selectManyMembersByGuildIdAndUserId = db
		.select()
		.from(MEMBERS_TABLE)
		.where(and(
			eq(MEMBERS_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBERS_TABLE.userId, sql.placeholder("userId")),
		))
		.orderBy(MEMBERS_TABLE.isPrioritized, MEMBERS_TABLE.positionTime)
		.prepare();

	const selectManyMembersByGuildId = db
		.select()
		.from(MEMBERS_TABLE)
		.where(
			eq(MEMBERS_TABLE.guildId, sql.placeholder("guildId")),
		)
		.orderBy(MEMBERS_TABLE.isPrioritized, MEMBERS_TABLE.positionTime)
		.prepare();

	const selectManyMembersByQueueIdAndCount = db
		.select()
		.from(MEMBERS_TABLE)
		.where(
			eq(MEMBERS_TABLE.queueId, sql.placeholder("queueId")),
		)
		.orderBy(MEMBERS_TABLE.isPrioritized, MEMBERS_TABLE.positionTime)
		.limit(sql.placeholder("count"))
		.prepare();

	const selectManyMembersByQueueId = db
		.select()
		.from(MEMBERS_TABLE)
		.where(
			eq(MEMBERS_TABLE.queueId, sql.placeholder("queueId")),
		)
		.orderBy(MEMBERS_TABLE.isPrioritized, MEMBERS_TABLE.positionTime)
		.prepare();

	// Schedules

	const selectScheduleById = db
		.select()
		.from(SCHEDULES_TABLE)
		.where(
			eq(SCHEDULES_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectManySchedulesByGuildId = db
		.select()
		.from(SCHEDULES_TABLE)
		.where(
			eq(SCHEDULES_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManySchedulesByQueueId = db
		.select()
		.from(SCHEDULES_TABLE)
		.where(
			eq(SCHEDULES_TABLE.queueId, sql.placeholder("queueId")),
		)
		.prepare();

	// Whitelisted

	const selectWhitelistedById = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(
			eq(WHITELISTED_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectWhitelistedByQueueIdAndSubjectId = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(and(
			eq(WHITELISTED_TABLE.queueId, sql.placeholder("queueId")),
			eq(WHITELISTED_TABLE.subjectId, sql.placeholder("subjectId"))
		))
		.prepare();

	const selectManyWhitelistedByGuildIdAndSubjectId = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(and(
			eq(WHITELISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(WHITELISTED_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyWhitelistedByGuildId = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(
			eq(WHITELISTED_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyWhitelistedByQueueId = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(
			eq(WHITELISTED_TABLE.queueId, sql.placeholder("queueId")),
		)
		.prepare();

	// Blacklisted

	const selectBlacklistedById = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(
			eq(BLACKLISTED_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectBlacklistedByQueueIdAndSubjectId = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(and(
			eq(BLACKLISTED_TABLE.queueId, sql.placeholder("queueId")),
			eq(BLACKLISTED_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyBlacklistedByGuildIdAndSubjectId = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(and(
			eq(BLACKLISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(BLACKLISTED_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyBlacklistedByGuildId = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(
			eq(BLACKLISTED_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyBlacklistedByQueueId = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(
			eq(BLACKLISTED_TABLE.queueId, sql.placeholder("queueId")),
		)
		.prepare();

	// Prioritized

	const selectPrioritizedById = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(
			eq(PRIORITIZED_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectPrioritizedByQueueIdAndSubjectId = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(and(
			eq(PRIORITIZED_TABLE.queueId, sql.placeholder("queueId")),
			eq(PRIORITIZED_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyPrioritizedByGuildId = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(
			eq(PRIORITIZED_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyPrioritizedByGuildIdAndSubjectId = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(and(
			eq(PRIORITIZED_TABLE.guildId, sql.placeholder("guildId")),
			eq(PRIORITIZED_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyPrioritizedByQueueId = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(
			eq(PRIORITIZED_TABLE.queueId, sql.placeholder("queueId")),
		)
		.orderBy(PRIORITIZED_TABLE.queueId)
		.prepare();

	// Admins

	const selectAdminById = db
		.select()
		.from(ADMINS_TABLE)
		.where(
			eq(ADMINS_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectAdminByGuildIdAndSubjectId = db
		.select()
		.from(ADMINS_TABLE)
		.where(and(
			eq(ADMINS_TABLE.guildId, sql.placeholder("guildId")),
			eq(ADMINS_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyAdminsBySubjectId = db
		.select()
		.from(ADMINS_TABLE)
		.where(
			eq(ADMINS_TABLE.subjectId, sql.placeholder("subjectId")),
		)
		.prepare();

	const selectManyAdminsByGuildId = db
		.select()
		.from(ADMINS_TABLE)
		.where(
			eq(ADMINS_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();
}

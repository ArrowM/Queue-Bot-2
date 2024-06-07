import fs from "node:fs";

import Database from "better-sqlite3";
import { subDays, subMonths } from "date-fns";
import type { Snowflake } from "discord.js";
import { and, count, eq, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { get } from "lodash-es";
import { schedule as cron } from "node-cron";

import type { GuildStat } from "../types/db.types.ts";
import type { PendingGuildUpdates } from "../types/misc.types.ts";
import { ClientUtils } from "../utils/client.utils.ts";
import * as schema from "./schema.ts";
import {
	ADMIN_TABLE,
	ARCHIVED_MEMBER_TABLE,
	BLACKLISTED_TABLE,
	DISPLAY_TABLE,
	GUILD_TABLE,
	MEMBER_TABLE,
	type NewPatchNote,
	PATCH_NOTE_TABLE,
	PRIORITIZED_TABLE,
	QUEUE_TABLE,
	SCHEDULE_TABLE,
	VOICE_TABLE,
	WHITELISTED_TABLE,
} from "./schema.ts";

export const DB_FILEPATH = "db/main.sqlite";
export const DB_BACKUP_DIRECTORY = "db/backups";
export const db = drizzle(Database(DB_FILEPATH).defaultSafeIntegers(), { schema });

/**
 * `QueryUtils` is responsible for handling all database read operations, including select queries.
 * These operations do not modify the database but are used to retrieve data.
 * All database write operations (insert, update, delete) are handled in `store.ts` to ensure they update the cache.
 *
 * ⚠️ IMPORTANT ⚠️: Queries must be written to include guildId!
 */
export namespace QueryUtils {

	// ====================================================================
	//                           Queries
	// ====================================================================

	// Guilds

	export function selectGuild(by: { guildId: Snowflake }) {
		return selectGuildById.get(by);
	}

	export function deleteGuild(by: { guildId: Snowflake }) {
		return db
			.delete(GUILD_TABLE)
			.where(
				eq(GUILD_TABLE.guildId, by.guildId),
			)
			.returning().get();
	}

	// Queues

	export function selectQueue(by: { guildId: Snowflake, id: bigint }) {
		return selectQueueById.get(by);
	}

	export function selectManyQueues(by: { guildId: Snowflake }) {
		return selectManyQueuesByGuildId.all(by);
	}

	// Voice

	export function selectVoice(by: { guildId: Snowflake, id: bigint }) {
		return selectVoiceById.get(by);
	}

	export function selectManyVoices(by: { guildId: Snowflake }) {
		return selectManyVoicesByGuildId.all(by);
	}

	// Displays

	export function selectDisplay(by:
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, lastMessageId: Snowflake } |
		{ guildId: Snowflake, queueId: bigint, displayChannelId: Snowflake },
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
		{ guildId: Snowflake, queueId: bigint } |
		{ guildId: Snowflake, displayChannelId: Snowflake },
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
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, queueId: bigint, userId?: Snowflake },
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
		{ guildId: Snowflake, queueId: bigint, count?: number },
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

	// Must allow by without guildId for automatic schedule running
	export function selectSchedule(by: { id: bigint }) {
		return selectScheduleById.get(by);
	}

	export function selectManySchedules(by:
		{ guildId: Snowflake } |
		{ guildId: Snowflake, queueId: bigint },
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
			.from(SCHEDULE_TABLE)
			.all();
	}

	export function deleteSchedule(by: { guildId: Snowflake, id: bigint }) {
		return db
			.delete(SCHEDULE_TABLE)
			.where(
				eq(SCHEDULE_TABLE.id, by.id),
			)
			.returning().get();
	}

	// Whitelisted

	export function selectWhitelisted(by:
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, queueId: bigint, subjectId: Snowflake },
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
		{ guildId: Snowflake, queueId: bigint },
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
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, queueId: bigint, subjectId: Snowflake },
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
		{ guildId: Snowflake, queueId: bigint },
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
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, queueId: bigint, subjectId: Snowflake },
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
		{ guildId: Snowflake, queueId: bigint },
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
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, subjectId: Snowflake },
	) {
		if ("id" in by) {
			return selectAdminById.get(by);
		}
		else if ("guildId" in by && "subjectId" in by) {
			return selectAdminByGuildIdAndSubjectId.get(by);
		}
	}

	export function selectManyAdmins(by:
		{ guildId: Snowflake, subjectId: Snowflake } |
		{ guildId: Snowflake },
	) {
		if ("subjectId" in by) {
			return selectManyAdminsBySubjectId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyAdminsByGuildId.all(by);
		}
	}

	// Archived Members

	export function selectArchivedMember(by:
		{ guildId: Snowflake, id: bigint } |
		{ guildId: Snowflake, queueId: bigint, userId: Snowflake },
	) {
		if ("id" in by) {
			return selectArchivedMemberById.get(by);
		}
		else if ("queueId" in by && "userId" in by) {
			return selectArchivedMemberByQueueIdAndUserId.get(by);
		}
	}

	export function selectManyArchivedMembers(by:
		{ guildId: Snowflake, userId?: Snowflake } |
		{ guildId: Snowflake, queueId: bigint },
	) {
		if ("guildId" in by && "userId" in by) {
			return selectManyArchivedMembersByGuildIdAndUserId.all(by);
		}
		else if ("guildId" in by) {
			return selectManyArchivedMembersByGuildId.all(by);
		}
		else if ("queueId" in by) {
			return selectManyArchivedMembersByQueueId.all(by);
		}
	}

	// Patch Notes

	export function selectAllPatchNotes() {
		return db
			.select()
			.from(PATCH_NOTE_TABLE)
			.all();
	}

	export function insertPatchNotes(patchNote: NewPatchNote) {
		return db
			.insert(PATCH_NOTE_TABLE)
			.values(patchNote)
			.returning().get();
	}


	// ====================================================================
	//                           Prepared Selects
	// ====================================================================

	// Guilds

	const selectGuildById = db
		.select()
		.from(GUILD_TABLE)
		.where(
			eq(GUILD_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Queues

	const selectQueueById = db
		.select()
		.from(QUEUE_TABLE)
		.where(and(
			eq(QUEUE_TABLE.guildId, sql.placeholder("guildId")),
			eq(QUEUE_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectManyQueuesByGuildId = db
		.select()
		.from(QUEUE_TABLE)
		.where(
			eq(QUEUE_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Voice

	const selectVoiceById = db
		.select()
		.from(VOICE_TABLE)
		.where(and(
			eq(VOICE_TABLE.guildId, sql.placeholder("guildId")),
			eq(VOICE_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectManyVoicesByGuildId = db
		.select()
		.from(VOICE_TABLE)
		.where(
			eq(VOICE_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Displays

	const selectDisplayById = db
		.select()
		.from(DISPLAY_TABLE)
		.where(and(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
			eq(DISPLAY_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectDisplayByLastMessageId = db
		.select()
		.from(DISPLAY_TABLE)
		.where(and(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
			eq(DISPLAY_TABLE.lastMessageId, sql.placeholder("lastMessageId")),
		))
		.prepare();

	const selectDisplayByQueueIdAndDisplayChannelId = db
		.select()
		.from(DISPLAY_TABLE)
		.where(and(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
			eq(DISPLAY_TABLE.queueId, sql.placeholder("queueId")),
			eq(DISPLAY_TABLE.displayChannelId, sql.placeholder("displayChannelId")),
		))
		.prepare();

	const selectManyDisplaysByGuildId = db
		.select()
		.from(DISPLAY_TABLE)
		.where(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyDisplaysByQueueId = db
		.select()
		.from(DISPLAY_TABLE)
		.where(and(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
			eq(DISPLAY_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();

	const selectManyDisplaysByDisplayChannelId = db
		.select()
		.from(DISPLAY_TABLE)
		.where(and(
			eq(DISPLAY_TABLE.guildId, sql.placeholder("guildId")),
			eq(DISPLAY_TABLE.displayChannelId, sql.placeholder("displayChannelId")),
		))
		.prepare();

	// Members

	const selectMemberById = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectMemberByQueueIdAndUserId = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.queueId, sql.placeholder("queueId")),
			eq(MEMBER_TABLE.userId, sql.placeholder("userId")),
		))
		.prepare();

	const selectNextMemberByQueue = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.queueId, sql.placeholder("queueId")),
		))
		.orderBy(MEMBER_TABLE.priority, MEMBER_TABLE.positionTime)
		.prepare();

	const MEMBER_ORDER = [
		// Raw SQL for CASE statement to handle NULL values
		sql`CASE WHEN ${MEMBER_TABLE.priority} IS NULL THEN 1 ELSE 0 END`,
		MEMBER_TABLE.priority,
		MEMBER_TABLE.positionTime,
	];

	const selectManyMembersByGuildIdAndUserId = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.userId, sql.placeholder("userId")),
		))
		.orderBy(...MEMBER_ORDER)
		.prepare();

	const selectManyMembersByGuildId = db
		.select()
		.from(MEMBER_TABLE)
		.where(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
		)
		.orderBy(...MEMBER_ORDER)
		.prepare();

	const selectManyMembersByQueueIdAndCount = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.queueId, sql.placeholder("queueId")),
		))
		.orderBy(...MEMBER_ORDER)
		.limit(sql.placeholder("count"))
		.prepare();

	const selectManyMembersByQueueId = db
		.select()
		.from(MEMBER_TABLE)
		.where(and(
			eq(MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(MEMBER_TABLE.queueId, sql.placeholder("queueId")),
		))
		.orderBy(...MEMBER_ORDER)
		.prepare();

	// Schedules

	const selectScheduleById = db
		.select()
		.from(SCHEDULE_TABLE)
		.where(
			eq(SCHEDULE_TABLE.id, sql.placeholder("id")),
		)
		.prepare();

	const selectManySchedulesByGuildId = db
		.select()
		.from(SCHEDULE_TABLE)
		.where(
			eq(SCHEDULE_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManySchedulesByQueueId = db
		.select()
		.from(SCHEDULE_TABLE)
		.where(and(
			eq(SCHEDULE_TABLE.guildId, sql.placeholder("guildId")),
			eq(SCHEDULE_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();

	// Whitelisted

	const selectWhitelistedById = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(and(
			eq(WHITELISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(WHITELISTED_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectWhitelistedByQueueIdAndSubjectId = db
		.select()
		.from(WHITELISTED_TABLE)
		.where(and(
			eq(WHITELISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(WHITELISTED_TABLE.queueId, sql.placeholder("queueId")),
			eq(WHITELISTED_TABLE.subjectId, sql.placeholder("subjectId")),
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
		.where(and(
			eq(WHITELISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(WHITELISTED_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();

	// Blacklisted

	const selectBlacklistedById = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(and(
			eq(BLACKLISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(BLACKLISTED_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectBlacklistedByQueueIdAndSubjectId = db
		.select()
		.from(BLACKLISTED_TABLE)
		.where(and(
			eq(BLACKLISTED_TABLE.guildId, sql.placeholder("guildId")),
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
		.where(and(
			eq(BLACKLISTED_TABLE.guildId, sql.placeholder("guildId")),
			eq(BLACKLISTED_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();

	// Prioritized

	const selectPrioritizedById = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(and(
			eq(PRIORITIZED_TABLE.guildId, sql.placeholder("guildId")),
			eq(PRIORITIZED_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectPrioritizedByQueueIdAndSubjectId = db
		.select()
		.from(PRIORITIZED_TABLE)
		.where(and(
			eq(PRIORITIZED_TABLE.guildId, sql.placeholder("guildId")),
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
		.where(and(
			eq(PRIORITIZED_TABLE.guildId, sql.placeholder("guildId")),
			eq(PRIORITIZED_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();

	// Admins

	const selectAdminById = db
		.select()
		.from(ADMIN_TABLE)
		.where(and(
			eq(ADMIN_TABLE.guildId, sql.placeholder("guildId")),
			eq(ADMIN_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectAdminByGuildIdAndSubjectId = db
		.select()
		.from(ADMIN_TABLE)
		.where(and(
			eq(ADMIN_TABLE.guildId, sql.placeholder("guildId")),
			eq(ADMIN_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyAdminsBySubjectId = db
		.select()
		.from(ADMIN_TABLE)
		.where(and(
			eq(ADMIN_TABLE.guildId, sql.placeholder("guildId")),
			eq(ADMIN_TABLE.subjectId, sql.placeholder("subjectId")),
		))
		.prepare();

	const selectManyAdminsByGuildId = db
		.select()
		.from(ADMIN_TABLE)
		.where(
			eq(ADMIN_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	// Archived Members

	const selectArchivedMemberById = db
		.select()
		.from(ARCHIVED_MEMBER_TABLE)
		.where(and(
			eq(ARCHIVED_MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(ARCHIVED_MEMBER_TABLE.id, sql.placeholder("id")),
		))
		.prepare();

	const selectArchivedMemberByQueueIdAndUserId = db
		.select()
		.from(ARCHIVED_MEMBER_TABLE)
		.where(and(
			eq(ARCHIVED_MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(ARCHIVED_MEMBER_TABLE.queueId, sql.placeholder("queueId")),
			eq(ARCHIVED_MEMBER_TABLE.userId, sql.placeholder("userId")),
		))
		.prepare();

	const selectManyArchivedMembersByGuildIdAndUserId = db
		.select()
		.from(ARCHIVED_MEMBER_TABLE)
		.where(and(
			eq(ARCHIVED_MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(ARCHIVED_MEMBER_TABLE.userId, sql.placeholder("userId")),
		))
		.prepare();

	const selectManyArchivedMembersByGuildId = db
		.select()
		.from(ARCHIVED_MEMBER_TABLE)
		.where(
			eq(ARCHIVED_MEMBER_TABLE.guildId, sql.placeholder("guildId")),
		)
		.prepare();

	const selectManyArchivedMembersByQueueId = db
		.select()
		.from(ARCHIVED_MEMBER_TABLE)
		.where(and(
			eq(ARCHIVED_MEMBER_TABLE.guildId, sql.placeholder("guildId")),
			eq(ARCHIVED_MEMBER_TABLE.queueId, sql.placeholder("queueId")),
		))
		.prepare();
}

// ====================================================================
//                           Db Guild Updates
// ====================================================================

let PENDING_GUILD_UPDATES: PendingGuildUpdates = {};

// Increment a stat for a guild
export function incrementGuildStat(guildId: Snowflake, stat: GuildStat, by = 1) {
	if (!PENDING_GUILD_UPDATES[guildId]) {
		PENDING_GUILD_UPDATES[guildId] = {};
	}
	if (!PENDING_GUILD_UPDATES[guildId][stat]) {
		PENDING_GUILD_UPDATES[guildId][stat] = 0;
	}
	PENDING_GUILD_UPDATES[guildId][stat]! += by;
}

export async function flushPendingGuildUpdatesToDB() {
	// Start a transaction
	db.transaction(() => {
		for (const guildId in PENDING_GUILD_UPDATES) {
			try {
				const updates = PENDING_GUILD_UPDATES[guildId];
				for (const stat in updates) {
					const column = get(GUILD_TABLE, stat);
					const value = updates[stat as GuildStat] as number;
					const columnName = column.name;
					db.run(
						sql`UPDATE guild
                SET ${sql.raw(columnName)} = ${sql.raw(columnName)} + ${value}
                WHERE ${sql.raw(GUILD_TABLE.guildId.name)} = ${guildId};`,
					);
				}
				db.update(GUILD_TABLE)
					.set({ lastUpdateTime: BigInt(new Date().getTime()) })
					.where(
						eq(GUILD_TABLE.guildId, guildId),
					)
					.run();
			}
			catch (e) {
				const { message, stack } = e as Error;
				console.error("Failed to flush guild updates to db:");
				console.error(`Error: ${message}`);
				console.error(`Stack Trace: ${stack}`);
			}
		}
	});
	PENDING_GUILD_UPDATES = {};
}

// Write pending guild updates to the database every 5 minutes
cron("*/5 * * * *", async () => {
	try {
		await flushPendingGuildUpdatesToDB();
	}
	catch (e) {
		const { message, stack } = e as Error;
		console.error("Failed to write pending guild updates to the database:");
		console.error(`Error: ${message}`);
		console.error(`Stack Trace: ${stack}`);
	}
});

// ====================================================================
//                    Database Cleanup and Backup
// ====================================================================

// Database backup (every 3 hours)
cron("0 */3 * * *", async () => {
	try {
		backupPrep();
		deleteOldBackups();
		deleteOldArchivedMembers();
		await deleteDeadGuilds();
		logStats();
		backup();
	}
	catch (e) {
		const { message, stack } = e as Error;
		console.error("Database backup failed:");
		console.error(`Error: ${message}`);
		console.error(`Stack Trace: ${stack}`);
	}
});

function backupPrep() {
	if (!fs.existsSync(DB_BACKUP_DIRECTORY)) {
		fs.mkdirSync(DB_BACKUP_DIRECTORY);
	}
}

// Delete backups older than 2 days
function deleteOldBackups() {
	fs.readdirSync(DB_BACKUP_DIRECTORY).forEach(file => {
		const filePath = `${DB_BACKUP_DIRECTORY}/${file}`;
		const stats = fs.statSync(filePath);
		if (stats.isFile() && stats.mtime < subDays(new Date(), 2)) {
			fs.unlinkSync(filePath);
			console.log(`Deleted old backup: ${filePath}`);
		}
	});
}

// Delete the entries from the ARCHIVED_MEMBER table that are older than one month
function deleteOldArchivedMembers() {
	const oneMonthAgo = BigInt(subMonths(new Date(), 1).getTime());
	db.delete(ARCHIVED_MEMBER_TABLE)
		.where(
			lt(ARCHIVED_MEMBER_TABLE.archivedTime, oneMonthAgo),
		)
		.run();
}

async function deleteDeadGuilds() {
	const oneMonthAgo = BigInt(subMonths(new Date(), 1).getTime());
	// Start a transaction
	await db.transaction(async () => {
		const oldGuilds = db.select()
			.from(GUILD_TABLE)
			.where(
				lt(GUILD_TABLE.lastUpdateTime, oneMonthAgo),
			)
			.all();
		for (const guild of oldGuilds) {
			const jsGuild = await ClientUtils.getGuild(guild.guildId);
			if (jsGuild == null) {
				db.delete(GUILD_TABLE)
					.where(
						eq(GUILD_TABLE.guildId, guild.guildId),
					)
					.run();
				console.log(`Deleted dead guild: ${guild.guildId}`);
			}
		}
	});
}

function logStats() {
	console.log("Guilds: ", db.select({ count: count() }).from(GUILD_TABLE).get().count);
	console.log("Queues: ", db.select({ count: count() }).from(QUEUE_TABLE).get().count);
	console.log("Voices: ", db.select({ count: count() }).from(VOICE_TABLE).get().count);
	console.log("Members: ", db.select({ count: count() }).from(MEMBER_TABLE).get().count);
	console.log("Displays: ", db.select({ count: count() }).from(DISPLAY_TABLE).get().count);
	console.log("Schedules: ", db.select({ count: count() }).from(SCHEDULE_TABLE).get().count);
	console.log("Blacklisted: ", db.select({ count: count() }).from(BLACKLISTED_TABLE).get().count);
	console.log("Whitelisted: ", db.select({ count: count() }).from(WHITELISTED_TABLE).get().count);
	console.log("Prioritized ", db.select({ count: count() }).from(PRIORITIZED_TABLE).get().count);
	console.log("Admins: ", db.select({ count: count() }).from(ADMIN_TABLE).get().count);
	console.log("Archived Members: ", db.select({ count: count() }).from(ARCHIVED_MEMBER_TABLE).get().count);
}

// Create a backup of the SQLite database file
function backup() {
	console.log("Creating backup...");

	// Get backup filepath
	const dateStr = new Date().toLocaleString("en-US", { hour12: false }).replace(/\D/g, "_");
	const backupFilepath = `${DB_BACKUP_DIRECTORY}/main_${dateStr}.sqlite`;

	// Copy the SQLite database file to the backup location
	fs.copyFile(DB_FILEPATH, backupFilepath, (err) => {
		if (err) {
			console.error("Failed to create backup:", err);
		}
		else {
			console.log(`Backup created successfully: ${backupFilepath}`);
		}
	});
}

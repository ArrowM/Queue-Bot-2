import * as fs from "node:fs";

import Database from "better-sqlite3";
import { subDays, subMonths } from "date-fns";
import type { Snowflake } from "discord.js";
import { count, eq, lt, sql } from "drizzle-orm";
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
	PRIORITIZED_TABLE,
	QUEUE_TABLE,
	SCHEDULE_TABLE,
	WHITELISTED_TABLE,
} from "./schema.ts";

const DB_FILEPATH = "db/main.sqlite";
const DB_BACKUP_DIRECTORY = "db/backups";

export const db = drizzle(Database(DB_FILEPATH).defaultSafeIntegers(), { schema });

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
			lt(ARCHIVED_MEMBER_TABLE.archivedTime, oneMonthAgo)
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
				lt(ARCHIVED_MEMBER_TABLE.archivedTime, oneMonthAgo)
			)
			.all();
		for (const guild of oldGuilds) {
			const jsGuild = await ClientUtils.getGuild(guild.guildId);
			if (jsGuild == null) {
				db.delete(GUILD_TABLE)
					.where(
						eq(GUILD_TABLE.guildId, guild.guildId)
					)
					.run();
				console.log(`Deleted dead guild: ${guild.guildId}`);
			}
		}
	});
}

function logStats() {
	console.log("Guilds:", db.select({ count: count() }).from(GUILD_TABLE).run());
	console.log("Queues:", db.select({ count: count() }).from(QUEUE_TABLE).run());
	console.log("Members:", db.select({ count: count() }).from(MEMBER_TABLE).run());
	console.log("Displays:", db.select({ count: count() }).from(DISPLAY_TABLE).run());
	console.log("Schedules:", db.select({ count: count() }).from(SCHEDULE_TABLE).run());
	console.log("Blacklisted:", db.select({ count: count() }).from(BLACKLISTED_TABLE).run());
	console.log("Whitelisted:", db.select({ count: count() }).from(WHITELISTED_TABLE).run());
	console.log("Prioritized", db.select({ count: count() }).from(PRIORITIZED_TABLE).run());
	console.log("Admins:", db.select({ count: count() }).from(ADMIN_TABLE).run());
	console.log("Archived Members:", db.select({ count: count() }).from(ARCHIVED_MEMBER_TABLE).run());
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

async function flushPendingGuildUpdatesToDB() {
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
                WHERE ${sql.raw(GUILD_TABLE.guildId.name)} = ${guildId};`
					);
				}
				db.update(GUILD_TABLE)
					.set({ lastUpdateTime: BigInt(new Date().getTime()) })
					.where(
						eq(GUILD_TABLE.guildId, guildId)
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

// Signal handlers for graceful shutdown
process.on("SIGINT", async () => {
	await flushPendingGuildUpdatesToDB();
	process.exit(0);
});
process.on("SIGTERM", async () => {
	await flushPendingGuildUpdatesToDB();
	process.exit(0);
});
process.on("uncaughtException", async () => {
	await flushPendingGuildUpdatesToDB();
	process.exit(1);
});
process.on("unhandledRejection", async () => {
	await flushPendingGuildUpdatesToDB();
	process.exit(1);
});

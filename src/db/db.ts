import * as fs from "node:fs";

import Database from "better-sqlite3";
import { subDays, subMonths } from "date-fns";
import { count, eq, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schedule as cron } from "node-cron";

import type { PendingGuildUpdates } from "../types/misc.types.ts";
import { ClientUtils } from "../utils/client.utils.ts";
import * as schema from "./schema.ts";
import {
	ADMIN_TABLE,
	ARCHIVED_MEMBER_TABLE, BLACKLISTED_TABLE,
	DISPLAY_TABLE,
	GUILD_TABLE,
	MEMBER_TABLE, PRIORITIZED_TABLE,
	QUEUE_TABLE,
	SCHEDULE_TABLE, WHITELISTED_TABLE,
} from "./schema.ts";

const DB_FILEPATH = "db/main.sqlite";
const DB_BACKUP_DIRECTORY = "db/backups";

export const db = drizzle(Database(DB_FILEPATH).defaultSafeIntegers(), { schema });

// Database schedule (every 3 hours)
cron("0 */3 * * *", async () => {
	deleteOldBackups();
	deleteOldArchivedMembers();
	await deleteDeadGuilds();
	logStats();
	backup();
});

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

	// Ensure the backup directory exists
	if (!fs.existsSync(DB_BACKUP_DIRECTORY)) {
		fs.mkdirSync(DB_BACKUP_DIRECTORY);
	}

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

export let PENDING_GUILD_UPDATES: PendingGuildUpdates = {};

async function flushCacheToDB() {
	// Start a transaction
	db.transaction(() => {
		for (const guildId in PENDING_GUILD_UPDATES) {
			const updates = PENDING_GUILD_UPDATES[guildId];
			for (const stat in updates) {
				// @ts-ignore
				const value = updates[stat] as number;
				db.update(GUILD_TABLE)
					.set({ [stat]: sql.raw(`${stat} + ${value}`) })
					.where(
						eq(GUILD_TABLE.guildId, guildId)
					)
					.run();
			}
			db.update(GUILD_TABLE)
				.set({ lastUpdateTime: BigInt(new Date().getTime()) })
				.where(
					eq(GUILD_TABLE.guildId, guildId)
				)
				.run();
		}
	});
	PENDING_GUILD_UPDATES = {};
}

// Write pending guild updates to the database every minute
setInterval(() => flushCacheToDB(), 60000);

// Signal handlers for graceful shutdown
process.on("SIGINT", async () => {
	await flushCacheToDB();
	process.exit(0);
});
process.on("SIGTERM", async () => {
	await flushCacheToDB();
	process.exit(0);
});
process.on("uncaughtException", async () => {
	await flushCacheToDB();
	process.exit(1);
});
process.on("unhandledRejection", async () => {
	await flushCacheToDB();
	process.exit(1);
});

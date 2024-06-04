import * as fs from "node:fs";

import Database from "better-sqlite3";
import { subDays, subMonths } from "date-fns";
import { lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schedule as cron } from "node-cron";

import * as schema from "./schema.ts";
import { ARCHIVED_MEMBER_TABLE } from "./schema.ts";

const DB_FILEPATH = "db/main.sqlite";
const DB_BACKUP_DIRECTORY = "db/backups";

export const db = drizzle(Database(DB_FILEPATH).defaultSafeIntegers(), { schema });

// Database schedule (every 3 hours)
cron("0 */3 * * *", () => {
	deleteOldBackups();
	backup();
	deleteOldArchivedMembers();
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

// Create a backup of the SQLite database file
function backup() {
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

// Delete the entries from the ARCHIVED_MEMBER table that are older than one month
function deleteOldArchivedMembers() {
	const oneMonthAgo = BigInt(subMonths(new Date(), 1).getTime());
	db.delete(ARCHIVED_MEMBER_TABLE)
		.where(
			lt(ARCHIVED_MEMBER_TABLE.archivedTime, oneMonthAgo)
		)
		.run();
}
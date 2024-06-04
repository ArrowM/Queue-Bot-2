import * as fs from "node:fs";

import Database from "better-sqlite3";
import { subDays } from "date-fns";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { schedule as cron } from "node-cron";

import * as schema from "./schema.ts";

const DB_FILEPATH = "db/main.sqlite";
const DB_BACKUP_DIRECTORY = "db/backups";

export const db = drizzle(Database(DB_FILEPATH).defaultSafeIntegers(), { schema });

// Backup database every other hour
cron("0 */2 * * *", () => {
	// Get backup filepath
	const now = new Date();
	const dateStr = now.toLocaleString("en-US", { hour12: false }).replace(/\D/g, "_");
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

	// Delete backups older than 2 days
	fs.readdirSync(DB_BACKUP_DIRECTORY).forEach(file => {
		const filePath = `${DB_BACKUP_DIRECTORY}/${file}`;
		const stats = fs.statSync(filePath);
		if (stats.isFile() && stats.mtime < subDays(now, 2)) {
			fs.unlinkSync(filePath);
			console.log(`Deleted old backup: ${filePath}`);
		}
	});
});

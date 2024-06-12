ALTER TABLE `guild` ADD `log_channel_id` text;--> statement-breakpoint
ALTER TABLE `guild` ADD `log_scope` text;--> statement-breakpoint
ALTER TABLE `queue` DROP COLUMN `log_channel_id`;--> statement-breakpoint
ALTER TABLE `queue` DROP COLUMN `log_level`;
ALTER TABLE `queue` RENAME COLUMN `role_id` TO `role_in_queue_id`;--> statement-breakpoint
ALTER TABLE `queue` ADD `role_on_pull_id` text;
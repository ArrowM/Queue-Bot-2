ALTER TABLE `queue` RENAME COLUMN `grace_period` TO `rejoin_cooldown_period`;--> statement-breakpoint
ALTER TABLE `queue` ADD `rejoin_grace_period` integer DEFAULT 0 NOT NULL;
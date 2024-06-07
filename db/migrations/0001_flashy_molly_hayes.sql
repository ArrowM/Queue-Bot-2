DROP INDEX IF EXISTS `display_guild_id_index`;--> statement-breakpoint
CREATE INDEX `voice_guild_id_index` ON `voice` (`guild_id`);
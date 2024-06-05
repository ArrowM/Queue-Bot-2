CREATE TABLE `admin`
(
    `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`   text                              NOT NULL,
    `subject_id` text                              NOT NULL,
    `is_role`    integer                           NOT NULL,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `archived_member`
(
    `id`            integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`      text                              NOT NULL,
    `queue_id`      integer                           NOT NULL,
    `user_id`       text                              NOT NULL,
    `message`       text,
    `position_time` integer                           NOT NULL,
    `join_time`     integer                           NOT NULL,
    `archived_time` integer                           NOT NULL,
    `text`          text                              NOT NULL,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `blacklisted`
(
    `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`   text                              NOT NULL,
    `queue_id`   integer                           NOT NULL,
    `subject_id` text                              NOT NULL,
    `is_role`    integer                           NOT NULL,
    `reason`     text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `display`
(
    `id`                 integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`           text                              NOT NULL,
    `queue_id`           integer                           NOT NULL,
    `display_channel_id` text                              NOT NULL,
    `last_message_id`    text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild`
(
    `guild_id`               text PRIMARY KEY  NOT NULL,
    `joinTime`               integer           NOT NULL,
    `last_updated_time`      integer           NOT NULL,
    `commands_received`      integer DEFAULT 0 NOT NULL,
    `buttons_received`       integer DEFAULT 0 NOT NULL,
    `displays_sent`          integer DEFAULT 0 NOT NULL,
    `queues_added`           integer DEFAULT 0 NOT NULL,
    `members_added`          integer DEFAULT 0 NOT NULL,
    `schedules_added`        integer DEFAULT 0 NOT NULL,
    `whitelisted_added`      integer DEFAULT 0 NOT NULL,
    `blacklisted_added`      integer DEFAULT 0 NOT NULL,
    `prioritized_added`      integer DEFAULT 0 NOT NULL,
    `admins_added`           integer DEFAULT 0 NOT NULL,
    `archived_members_added` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `member`
(
    `id`             integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`       text                              NOT NULL,
    `queue_id`       integer                           NOT NULL,
    `user_id`        text                              NOT NULL,
    `message`        text,
    `position_time`  integer                           NOT NULL,
    `join_time`      integer                           NOT NULL,
    `is_prioritized` integer DEFAULT false             NOT NULL,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patch_note`
(
    `id`        integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `file_name` text                              NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prioritized`
(
    `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`   text                              NOT NULL,
    `queue_id`   integer                           NOT NULL,
    `subject_id` text                              NOT NULL,
    `is_role`    integer                           NOT NULL,
    `reason`     text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `queue`
(
    `id`                           integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name`                         text                              NOT NULL,
    `guild_id`                     text                              NOT NULL,
    `autopull_toggle`              integer DEFAULT false             NOT NULL,
    `buttons_toggle`               integer DEFAULT true              NOT NULL,
    `color`                        text    DEFAULT '#42aaec'         NOT NULL,
    `grace_period`                 integer DEFAULT 0                 NOT NULL,
    `header`                       text,
    `inline_toggle`                integer DEFAULT false             NOT NULL,
    `lock_toggle`                  integer DEFAULT false             NOT NULL,
    `log_channel_id`               text,
    `log_level`                    text    DEFAULT 'default'         NOT NULL,
    `member_display_type`          text    DEFAULT 'mention'         NOT NULL,
    `notifications_toggle`         integer DEFAULT false             NOT NULL,
    `pull_batch_size`              integer DEFAULT 1                 NOT NULL,
    `role_id`                      text,
    `size`                         integer,
    `time_display_type`            text    DEFAULT 'off',
    `update_type`                  text    DEFAULT 'edit'            NOT NULL,
    `source_voice_channel_id`      text,
    `destination_voice_channel_id` text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule`
(
    `id`       integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id` text                              NOT NULL,
    `queue_id` integer                           NOT NULL,
    `command`  text                              NOT NULL,
    `cron`     text                              NOT NULL,
    `timezone` text                              NOT NULL,
    `reason`   text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `whitelisted`
(
    `id`         integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `guild_id`   text                              NOT NULL,
    `queue_id`   integer                           NOT NULL,
    `subject_id` text                              NOT NULL,
    `is_role`    integer                           NOT NULL,
    `reason`     text,
    FOREIGN KEY (`guild_id`) REFERENCES `guild` (`guild_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`queue_id`) REFERENCES `queue` (`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_guild_id_index` ON `admin` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `admin_guild_id_subject_id_unique` ON `admin` (`guild_id`, `subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `archived_member_queue_id_user_id_unique` ON `archived_member` (`queue_id`, `user_id`);--> statement-breakpoint
CREATE INDEX `blacklisted_guild_id_index` ON `blacklisted` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `blacklisted_queue_id_subject_id_unique` ON `blacklisted` (`queue_id`, `subject_id`);--> statement-breakpoint
CREATE INDEX `display_guild_id_index` ON `display` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `display_queue_id_display_channel_id_unique` ON `display` (`queue_id`, `display_channel_id`);--> statement-breakpoint
CREATE INDEX `member_guild_id_index` ON `member` (`guild_id`);--> statement-breakpoint
CREATE INDEX `member_position_time_index` ON `member` (`position_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_queue_id_user_id_unique` ON `member` (`queue_id`, `user_id`);--> statement-breakpoint
CREATE INDEX `prioritized_guild_id_index` ON `prioritized` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `prioritized_guild_id_subject_id_unique` ON `prioritized` (`guild_id`, `subject_id`);--> statement-breakpoint
CREATE INDEX `queue_guild_id_index` ON `queue` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `queue_name_guild_id_unique` ON `queue` (`name`, `guild_id`);--> statement-breakpoint
CREATE INDEX `schedule_guild_id_index` ON `schedule` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_queue_id_command_cron_timezone_unique` ON `schedule` (`queue_id`, `command`, `cron`, `timezone`);--> statement-breakpoint
CREATE INDEX `whitelisted_guild_id_index` ON `whitelisted` (`guild_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `whitelisted_queue_id_subject_id_unique` ON `whitelisted` (`queue_id`, `subject_id`);
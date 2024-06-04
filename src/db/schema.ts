import type { ColorResolvable, Snowflake } from "discord.js";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { get } from "lodash-es";

import {
	Color,
	DisplayUpdateType,
	LogLevel,
	MemberDisplayType,
	ScheduleCommand,
	TimestampType,
} from "../types/db.types.ts";

export const GUILDS_TABLE = sqliteTable("guilds", ({
	guildId: text("guild_id").$type<Snowflake>().primaryKey(),

	joinedAt: integer("joined_at").$type<bigint>().notNull().$defaultFn(() => BigInt(Date.now())),
	commandsReceived: integer("commands_received").notNull().default(0),
	buttonsReceived: integer("buttons_received").notNull().default(0),
	displaysSent: integer("displays_sent").notNull().default(0),
	queuesAdded: integer("queues_added").notNull().default(0),
	membersAdded: integer("members_added").notNull().default(0),
	schedulesAdded: integer("schedules_added").notNull().default(0),
	whitelistedAdded: integer("whitelisted_added").notNull().default(0),
	blacklistedAdded: integer("blacklisted_added").notNull().default(0),
	prioritizedAdded: integer("prioritized_added").notNull().default(0),
	adminsAdded: integer("admins_added").notNull().default(0),
}));

export const GUILDS_RELATIONS = relations(GUILDS_TABLE, ({ many }) => ({
	queues: many(QUEUES_TABLE),
	displays: many(DISPLAYS_TABLE),
	members: many(MEMBERS_TABLE),
	schedules: many(SCHEDULES_TABLE),
	blacklisted: many(BLACKLISTED_TABLE),
	whitelisted: many(WHITELISTED_TABLE),
	prioritized: many(PRIORITIZED_TABLE),
	admin: many(ADMINS_TABLE),
}));

export type NewGuild = typeof GUILDS_TABLE.$inferInsert;
export type DbGuild = typeof GUILDS_TABLE.$inferSelect;

export const QUEUES_TABLE = sqliteTable("queues", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	name: text("name").notNull(),
	guildId: text("guild_id").$type<Snowflake>().notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),

	// configurable queue properties
	autopullToggle: integer("autopull_toggle", { mode: "boolean" }).notNull().default(false),
	buttonsToggle: integer("buttons_toggle", { mode: "boolean" }).notNull().default(true),
	color: text("color").$type<ColorResolvable>().notNull().default(get(Color, process.env.DEFAULT_COLOR) as ColorResolvable),
	gracePeriod: integer("grace_period").notNull().default(0),
	header: text("header"),
	inlineToggle: integer("inline_toggle", { mode: "boolean" }).notNull().default(false),
	lockToggle: integer("lock_toggle", { mode: "boolean" }).notNull().default(false),
	logChannelId: text("log_channel_id").$type<Snowflake | null>(),
	logLevel: text("log_level").$type<LogLevel>().notNull().default(LogLevel.Default),
	memberDisplayType: text("member_display_type").$type<MemberDisplayType>().notNull().default(MemberDisplayType.Mention),
	notificationsToggle: integer("notifications_toggle", { mode: "boolean" }).notNull().default(false),
	pullBatchSize: integer("pull_batch_size").notNull().default(1),
	roleId: text("role_id").$type<Snowflake | null>(),
	size: integer("size"),
	timestampType: text("time_display_type").$type<TimestampType>().default(TimestampType.Off),
	updateType: text("update_type").$type<DisplayUpdateType>().notNull().default(DisplayUpdateType.Edit),

	// voice integration
	sourceVoiceChannelId: text("source_voice_channel_id").$type<Snowflake | null>(),
	destinationVoiceChannelId: text("destination_voice_channel_id").$type<Snowflake | null>(),
}),
(table) => ({
	unq: unique().on(table.name, table.guildId),
	guildIdIndex: index("queues_guild_id_index").on(table.guildId),
}));

export const QUEUES_RELATIONS = relations(QUEUES_TABLE, ({ one, many }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [QUEUES_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	displays: many(DISPLAYS_TABLE),
	members: many(MEMBERS_TABLE),
	schedules: many(SCHEDULES_TABLE),
	blacklisted: many(BLACKLISTED_TABLE),
	whitelisted: many(WHITELISTED_TABLE),
	prioritized: many(PRIORITIZED_TABLE),
}));

export type NewQueue = typeof QUEUES_TABLE.$inferInsert;
export type DbQueue = typeof QUEUES_TABLE.$inferSelect;


export const DISPLAYS_TABLE = sqliteTable("displays", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	displayChannelId: text("display_channel_id").notNull(),
	lastMessageId: text("last_message_id").$type<Snowflake | null>(),
}),
(table) => ({
	unq: unique().on(table.queueId, table.displayChannelId),
	guildIdIndex: index("displays_guild_id_index").on(table.guildId),
}));

export const DISPLAYS_RELATIONS = relations(DISPLAYS_TABLE, ({ many }) => ({
	guilds: many(GUILDS_TABLE),
	queues: many(QUEUES_TABLE),
}));

export type NewDisplay = typeof DISPLAYS_TABLE.$inferInsert;
export type DbDisplay = typeof DISPLAYS_TABLE.$inferSelect;


export const MEMBERS_TABLE = sqliteTable("members", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	userId: text("user_id").$type<Snowflake>().notNull(),
	message: text("message"),
	positionTime: integer("position_time").$type<bigint>().notNull().$defaultFn(() => BigInt(Date.now())),
	joinTime: integer("join_time").$type<bigint>().notNull().$defaultFn(() => BigInt(Date.now())),
	isPrioritized: integer("is_prioritized", { mode: "boolean" }).notNull().default(false),
}),
(table) => ({
	unq: unique().on(table.queueId, table.userId),
	guildIdIndex: index("members_guild_id_index").on(table.guildId),
	queueIdIndex: index("members_queue_id_index").on(table.queueId),
	positionTimeIndex: index("members_position_time_index").on(table.positionTime),
}));

export const MEMBERS_RELATIONS = relations(MEMBERS_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [MEMBERS_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	queues: one(QUEUES_TABLE, {
		fields: [MEMBERS_TABLE.guildId],
		references: [QUEUES_TABLE.guildId],
	}),
}));

export type NewMember = typeof MEMBERS_TABLE.$inferInsert;
export type DbMember = typeof MEMBERS_TABLE.$inferSelect;


export const SCHEDULES_TABLE = sqliteTable("schedules", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	command: text("command").notNull().$type<ScheduleCommand | null>(),
	cron: text("cron").notNull(),
	timezone: text("timezone").notNull(),
	reason: text("reason"),
}),
(table) => ({
	unq: unique().on(table.queueId, table.command, table.cron, table.timezone),
	guildIdIndex: index("schedules_guild_id_index").on(table.guildId),
	queueIdIndex: index("schedules_queue_id_index").on(table.queueId),
}));

export const SCHEDULES_RELATIONS = relations(SCHEDULES_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [SCHEDULES_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	queues: one(QUEUES_TABLE, {
		fields: [SCHEDULES_TABLE.guildId],
		references: [QUEUES_TABLE.guildId],
	}),
}));

export type NewSchedule = typeof SCHEDULES_TABLE.$inferInsert;
export type DbSchedule = typeof SCHEDULES_TABLE.$inferSelect;


export const BLACKLISTED_TABLE = sqliteTable("blacklisted", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").$type<Snowflake>().notNull(),
	isRole: integer("is_role", { mode: "boolean" }).notNull(),
	reason: text("reason"),
}),
(table) => ({
	guildIdIndex: index("blacklisted_guild_id_index").on(table.guildId),
	unq: unique().on(table.queueId, table.subjectId),
}));

export const BLACKLISTED_RELATIONS = relations(BLACKLISTED_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [BLACKLISTED_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	queues: one(QUEUES_TABLE, {
		fields: [BLACKLISTED_TABLE.guildId],
		references: [QUEUES_TABLE.guildId],
	}),
}));

export type NewBlacklisted = typeof BLACKLISTED_TABLE.$inferInsert;
export type DbBlacklisted = typeof BLACKLISTED_TABLE.$inferSelect;


export const WHITELISTED_TABLE = sqliteTable("whitelisted", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").$type<Snowflake>().notNull(),
	isRole: integer("is_role", { mode: "boolean" }).notNull(),
	reason: text("reason"),
}),
(table) => ({
	guildIdIndex: index("whitelisted_guild_id_index").on(table.guildId),
	unq: unique().on(table.queueId, table.subjectId),
}));

export const WHITELISTED_RELATIONS = relations(WHITELISTED_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [WHITELISTED_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	queues: one(QUEUES_TABLE, {
		fields: [WHITELISTED_TABLE.guildId],
		references: [QUEUES_TABLE.guildId],
	}),
}));

export type NewWhitelisted = typeof WHITELISTED_TABLE.$inferInsert;
export type DbWhitelisted = typeof WHITELISTED_TABLE.$inferSelect;


export const PRIORITIZED_TABLE = sqliteTable("prioritized", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	queueId: integer("queue_id").$type<bigint>().notNull().references(() => QUEUES_TABLE.id, { onDelete: "cascade" }),
	subjectId: text("subject_id").$type<Snowflake>().notNull(),
	isRole: integer("is_role", { mode: "boolean" }).notNull(),
	reason: text("reason"),
}),
(table) => ({
	guildIdIndex: index("prioritized_guild_id_index").on(table.guildId),
	unq: unique().on(table.guildId, table.subjectId),
}));

export const PRIORITIZED_RELATIONS = relations(PRIORITIZED_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [PRIORITIZED_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
	queues: one(QUEUES_TABLE, {
		fields: [PRIORITIZED_TABLE.guildId],
		references: [QUEUES_TABLE.guildId],
	}),
}));

export type NewPrioritized = typeof PRIORITIZED_TABLE.$inferInsert;
export type DbPrioritized = typeof PRIORITIZED_TABLE.$inferSelect;


export const ADMINS_TABLE = sqliteTable("admins", ({
	id: integer("id").$type<bigint>().primaryKey({ autoIncrement: true }),

	guildId: text("guild_id").notNull().references(() => GUILDS_TABLE.guildId, { onDelete: "cascade" }),
	subjectId: text("subject_id").$type<Snowflake>().notNull(),
	isRole: integer("is_role", { mode: "boolean" }).notNull(),
}),
(table) => ({
	guildIdIndex: index("admins_guild_id_index").on(table.guildId),
	unq: unique().on(table.guildId, table.subjectId),
}));

export const ADMINS_RELATIONS = relations(ADMINS_TABLE, ({ one }) => ({
	guilds: one(GUILDS_TABLE, {
		fields: [ADMINS_TABLE.guildId],
		references: [GUILDS_TABLE.guildId],
	}),
}));

export type NewAdmin = typeof ADMINS_TABLE.$inferInsert;
export type DbAdmin = typeof ADMINS_TABLE.$inferSelect;

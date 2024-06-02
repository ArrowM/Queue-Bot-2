import { type Collection, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { isNil, omitBy } from "lodash-es";

import type { DbQueue } from "../../db/schema.ts";
import { CommandOption } from "../../options/options/command.option.ts";
import { CronOption } from "../../options/options/cron.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { ReasonOption } from "../../options/options/reason.option.ts";
import { SchedulesOption } from "../../options/options/schedules.option.ts";
import { TimezoneOption } from "../../options/options/timezone.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { ScheduleUtils } from "../../utils/schedule.utils.ts";
import { describeTable, scheduleMention } from "../../utils/string.utils.ts";

export class SchedulesCommand extends AdminCommand {
	static readonly ID = "schedules";

	schedules_get = SchedulesCommand.schedules_get;
	schedules_add = SchedulesCommand.schedules_add;
	schedules_set = SchedulesCommand.schedules_set;
	schedules_delete = SchedulesCommand.schedules_delete;
	schedules_help = SchedulesCommand.schedules_help;

	data = new SlashCommandBuilder()
		.setName(SchedulesCommand.ID)
		.setDescription("Manage scheduled commands")
		.addSubcommand((subcommand) => {
			subcommand
				.setName("get")
				.setDescription("Get scheduled commands");
			Object.values(SchedulesCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("add")
				.setDescription("Create a scheduled command");
			Object.values(SchedulesCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("set")
				.setDescription("Update a scheduled command");
			Object.values(SchedulesCommand.SET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("delete")
				.setDescription("Delete a scheduled command");
			Object.values(SchedulesCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("help")
				.setDescription("Info about creating schedules");
			return subcommand;
		});

	// ====================================================================
	//                           /schedules get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get schedules of specific queue(s)" }),
	};

	static async schedules_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await SchedulesCommand.GET_OPTIONS.queues.get(inter);

		const schedules = [...inter.store.dbSchedules().values()];
		if (queues) {
			schedules.filter(schedule => queues.has(schedule.queueId));
		}

		const embeds = describeTable({
			store: inter.store,
			tableName: "Schedules",
			color: Color.Raspberry,
			mentionFn: scheduleMention,
			entries: schedules,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /schedules add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queues to create scheduled command for" }),
		command: new CommandOption({ required: true, description: "Command to schedule" }),
		cron: new CronOption({ required: true, description: "Cron schedule" }),
		timezone: new TimezoneOption({ required: true, description: "Timezone for the schedule" }),
		reason: new ReasonOption({ description: "Reason for the schedule" }),
	};

	static async schedules_add(inter: SlashInteraction) {
		const queues = await SchedulesCommand.ADD_OPTIONS.queues.get(inter);
		const schedule = {
			guildId: inter.guildId,
			command: SchedulesCommand.ADD_OPTIONS.command.get(inter),
			cron: SchedulesCommand.ADD_OPTIONS.cron.get(inter),
			timezone: await SchedulesCommand.ADD_OPTIONS.timezone.get(inter),
			reason: SchedulesCommand.ADD_OPTIONS.reason.get(inter),
		};

		ScheduleUtils.insertSchedules(inter.store, queues, schedule);

		await this.schedules_get(inter);
	}

	// ====================================================================
	//                           /schedules set
	// ====================================================================

	static readonly SET_OPTIONS = {
		schedules: new SchedulesOption({ required: true, description: "Scheduled commands to update" }),
		command: new CommandOption({ description: "Command to schedule" }),
		cron: new CronOption({ description: "Cron schedule" }),
		reason: new ReasonOption({ description: "Reason for the schedule" }),
		timezone: new TimezoneOption({ description: "Timezone for the schedule" }),
	};

	static async schedules_set(inter: SlashInteraction) {
		const schedules = await SchedulesCommand.SET_OPTIONS.schedules.get(inter);
		const scheduleUpdate = omitBy({
			command: SchedulesCommand.SET_OPTIONS.command.get(inter),
			cron: SchedulesCommand.SET_OPTIONS.cron.get(inter),
			timezone: SchedulesCommand.SET_OPTIONS.timezone.get(inter),
			reason: SchedulesCommand.SET_OPTIONS.reason.get(inter),
		}, isNil);

		const { updatedQueues } = ScheduleUtils.updateSchedules(inter.store, schedules, scheduleUpdate);

		await this.schedules_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /schedules delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		schedules: new SchedulesOption({ required: true, description: "Scheduled commands to delete" }),
	};

	static async schedules_delete(inter: SlashInteraction) {
		const schedules = await SchedulesCommand.DELETE_OPTIONS.schedules.get(inter);

		const { updatedQueues } = ScheduleUtils.deleteSchedules(schedules.map(sch => sch.id), inter.store);

		await this.schedules_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /schedules help
	// ====================================================================

	static async schedules_help(inter: SlashInteraction) {
		const embeds = [new EmbedBuilder()
			.setTitle("Scheduled Commands")
			.setDescription(
				"Some commands can be ran on a schedule using the cron schedule format. " +
				"https://crontab.guru/examples.html has common schedules. " +
				"ChatGPT can probably also help you with a schedule. " +
				"The highest frequency schedule you can set is once a minute.",
			)];

		await inter.respond({ embeds });
	}
}

import { type Collection, EmbedBuilder, inlineCode, italic, SlashCommandBuilder } from "discord.js";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { findKey, isNil, omitBy } from "lodash-es";

import { SelectMenuTransactor } from "../../core/select-menu-transactor.ts";
import { type DbQueue, QUEUES_TABLE } from "../../db/schema.ts";
import { AutopullToggleOption } from "../../options/options/autopull-toggle.option.ts";
import { BlacklistToggleOption } from "../../options/options/blacklist-toggle.option.ts";
import { ButtonsToggleOption } from "../../options/options/buttons-toggle.option.ts";
import { ColorOption } from "../../options/options/color.option.ts";
import { GracePeriodOption } from "../../options/options/grace-period.option.ts";
import { HeaderOption } from "../../options/options/header.option.ts";
import { InlineToggleOption } from "../../options/options/inline-toggle.option.ts";
import { LockToggleOption } from "../../options/options/lock-toggle.option.ts";
import { LogChannelOption } from "../../options/options/log-channel.option.ts";
import { LogLevelOption } from "../../options/options/log-level.option.ts";
import { NameOption } from "../../options/options/name.option.ts";
import { NotificationsToggleOption } from "../../options/options/notifications-enable.option.ts";
import { PartialPullToggleOption } from "../../options/options/partial-pull-enable.option.ts";
import { PullBatchSizeOption } from "../../options/options/pull-batch-size.option.ts";
import { QueueOption } from "../../options/options/queue.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { RoleOption } from "../../options/options/role.option.ts";
import { SizeOption } from "../../options/options/size.option.ts";
import { TimestampTypeOption } from "../../options/options/timestamp-type.option.ts";
import { UpdateTypeOption } from "../../options/options/update-type.option.ts";
import { WhitelistToggleOption } from "../../options/options/whitelist-toggle.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { DisplayUtils } from "../../utils/display.utils.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { QueueUtils } from "../../utils/queue.utils.ts";
import { commandMention, queueMention, queuesMention } from "../../utils/string.utils.ts";

export class QueuesCommand extends AdminCommand {
	static readonly ID = "queues";

	queues_get = QueuesCommand.queues_get;
	queues_add = QueuesCommand.queues_add;
	queues_set = QueuesCommand.queues_set;
	queues_reset = QueuesCommand.queues_reset;
	queues_delete = QueuesCommand.queues_delete;

	data = new SlashCommandBuilder()
		.setName(QueuesCommand.ID)
		.setDescription("Manage queues")
		.addSubcommand((subcommand) => {
			subcommand
				.setName("get")
				.setDescription("Get queues settings");
			Object.values(QueuesCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("add")
				.setDescription("Create a queue");
			Object.values(QueuesCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("set")
				.setDescription("Set queue properties");
			Object.values(QueuesCommand.SET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("reset")
				.setDescription("Reset queue properties");
			Object.values(QueuesCommand.RESET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand((subcommand) => {
			subcommand
				.setName("delete")
				.setDescription("Delete a queue");
			Object.values(QueuesCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /queues get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get specific queue(s)" }),
	};

	static async queues_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues
			?? await QueuesCommand.GET_OPTIONS.queues.get(inter)
			?? inter.store.dbQueues();

		let embeds: EmbedBuilder[];

		if (queues.size > 0) {
			embeds = queues.map(queue => new EmbedBuilder()
				.setColor(queue.color)
				.addFields({
					name: queueMention(queue),
					value: QueueUtils.getQueueProperties(queue),
				}),
			);
			embeds.push(new EmbedBuilder().setDescription(italic(`Queue settings can be updated with ${commandMention("queues", "set")}`)));
		}
		else {
			embeds = [new EmbedBuilder().setDescription(italic("no queues"))];
		}

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /queues add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		name: new NameOption({ required: true, description: "Name of the queue" }),
		color: new ColorOption({ description: "Color of the queue" }),
		autopullToggle: new AutopullToggleOption({ description: "Toggle autopull" }),
		buttonsToggle: new BlacklistToggleOption({ description: "Toggle buttons" }),
		inlineToggle: new InlineToggleOption({ description: "Toggle inline" }),
		lockToggle: new LockToggleOption({ description: "Toggle lock" }),
		notificationsToggle: new NotificationsToggleOption({ description: "Toggle notifications" }),
		partialPullToggle: new PartialPullToggleOption({ description: "Toggle partial pull" }),
		gracePeriod: new GracePeriodOption({ description: "Grace period in seconds" }),
		header: new HeaderOption({ description: "Header of the queue" }),
		logChannel: new LogChannelOption({ description: "Log channel" }),
		logLevel: new LogLevelOption({ description: "Log level" }),
		pullBatchSize: new PullBatchSizeOption({ description: "Pull batch size" }),
		role: new RoleOption({ description: "Role" }),
		size: new SizeOption({ description: "Size of the queue" }),
		timestampType: new TimestampTypeOption({ description: "Timestamp type" }),
		updateType: new UpdateTypeOption({ description: "Update type" }),
	};

	static async queues_add(inter: SlashInteraction) {
		const queue = {
			guildId: inter.guildId,
			name: QueuesCommand.ADD_OPTIONS.name.get(inter),
			...omitBy({
				color: QueuesCommand.ADD_OPTIONS.color.get(inter),
				autopullToggle: QueuesCommand.ADD_OPTIONS.autopullToggle.get(inter),
				buttonsToggle: QueuesCommand.ADD_OPTIONS.buttonsToggle.get(inter),
				inlineToggle: QueuesCommand.ADD_OPTIONS.inlineToggle.get(inter),
				lockToggle: QueuesCommand.ADD_OPTIONS.lockToggle.get(inter),
				notificationsToggle: QueuesCommand.ADD_OPTIONS.notificationsToggle.get(inter),
				partialPullToggle: QueuesCommand.ADD_OPTIONS.partialPullToggle.get(inter),
				gracePeriod: QueuesCommand.ADD_OPTIONS.gracePeriod.get(inter),
				header: QueuesCommand.ADD_OPTIONS.header.get(inter),
				logChannel: QueuesCommand.ADD_OPTIONS.logChannel.get(inter),
				logLevel: QueuesCommand.ADD_OPTIONS.logLevel.get(inter),
				pullBatchSize: QueuesCommand.ADD_OPTIONS.pullBatchSize.get(inter),
				role: QueuesCommand.ADD_OPTIONS.role.get(inter),
				size: QueuesCommand.ADD_OPTIONS.size.get(inter),
				timestampType: QueuesCommand.ADD_OPTIONS.timestampType.get(inter),
				updateType: QueuesCommand.ADD_OPTIONS.updateType.get(inter),
			}, isNil),
		};

		const insertedQueue = inter.store.insertQueue(queue);
		DisplayUtils.insertDisplays(inter.store, [insertedQueue], inter.channelId);

		await QueuesCommand.queues_get(inter, toCollection<bigint, DbQueue>("id", [insertedQueue]));
	}

	// ====================================================================
	//                           /queues set
	// ====================================================================

	static readonly SET_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queues to update" }),
		color: new ColorOption({ description: "Color of the queue" }),
		autopullToggle: new AutopullToggleOption({ description: "Toggle autopull" }),
		blacklistToggle: new BlacklistToggleOption({ description: "Toggle blacklist" }),
		buttonsToggle: new ButtonsToggleOption({ description: "Toggle buttons" }),
		inlineToggle: new InlineToggleOption({ description: "Toggle inline" }),
		lockToggle: new LockToggleOption({ description: "Toggle lock" }),
		notificationsToggle: new NotificationsToggleOption({ description: "Toggle notifications" }),
		enablePartialPull: new PartialPullToggleOption({ description: "Toggle partial pull" }),
		whitelistToggle: new WhitelistToggleOption({ description: "Toggle whitelist" }),
		gracePeriod: new GracePeriodOption({ description: "Grace period in seconds" }),
		header: new HeaderOption({ description: "Header of the queue" }),
		logChannel: new LogChannelOption({ description: "Log channel" }),
		logLevel: new LogLevelOption({ description: "Log level" }),
		name: new NameOption({ description: "Name of the queue" }),
		pullBatchSize: new PullBatchSizeOption({ description: "Pull batch size" }),
		role: new RoleOption({ description: "Role" }),
		size: new SizeOption({ description: "Size of the queue" }),
		timestampType: new TimestampTypeOption({ description: "Timestamp type" }),
		updateType: new UpdateTypeOption({ description: "Update type" }),
	};

	static async queues_set(inter: SlashInteraction) {
		const queues = await QueuesCommand.SET_OPTIONS.queues.get(inter);
		const update = omitBy({
			color: QueuesCommand.SET_OPTIONS.color.get(inter),
			autopullToggle: QueuesCommand.SET_OPTIONS.autopullToggle.get(inter),
			blacklistToggle: QueuesCommand.SET_OPTIONS.blacklistToggle.get(inter),
			buttonsToggle: QueuesCommand.SET_OPTIONS.buttonsToggle.get(inter),
			inlineToggle: QueuesCommand.SET_OPTIONS.inlineToggle.get(inter),
			lockToggle: QueuesCommand.SET_OPTIONS.lockToggle.get(inter),
			notificationsToggle: QueuesCommand.SET_OPTIONS.notificationsToggle.get(inter),
			enablePartialPull: QueuesCommand.SET_OPTIONS.enablePartialPull.get(inter),
			whitelistToggle: QueuesCommand.SET_OPTIONS.whitelistToggle.get(inter),
			gracePeriod: QueuesCommand.SET_OPTIONS.gracePeriod.get(inter),
			header: QueuesCommand.SET_OPTIONS.header.get(inter),
			logChannel: QueuesCommand.SET_OPTIONS.logChannel.get(inter),
			logLevel: QueuesCommand.SET_OPTIONS.logLevel.get(inter),
			name: QueuesCommand.SET_OPTIONS.name.get(inter),
			pullBatchSize: QueuesCommand.SET_OPTIONS.pullBatchSize.get(inter),
			role: QueuesCommand.SET_OPTIONS.role.get(inter),
			size: QueuesCommand.SET_OPTIONS.size.get(inter),
			timestampType: QueuesCommand.SET_OPTIONS.timestampType.get(inter),
			updateType: QueuesCommand.SET_OPTIONS.updateType.get(inter),
		}, isNil);

		const updatedQueues = queues.map(queue =>
			inter.store.updateQueue({ id: queue.id, ...update }),
		);
		DisplayUtils.requestDisplaysUpdate(inter.store, updatedQueues.map(queue => queue.id));

		await QueuesCommand.queues_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /queues reset
	// ====================================================================

	static readonly RESET_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queues to reset" }),
	};

	static async queues_reset(inter: SlashInteraction) {
		const queues = await QueuesCommand.RESET_OPTIONS.queues.get(inter);
		const resettableSettings = [
			ColorOption.ID,
			AutopullToggleOption.ID,
			BlacklistToggleOption.ID,
			ButtonsToggleOption.ID,
			InlineToggleOption.ID,
			LockToggleOption.ID,
			NotificationsToggleOption.ID,
			PartialPullToggleOption.ID,
			WhitelistToggleOption.ID,
			GracePeriodOption.ID,
			HeaderOption.ID,
			LogChannelOption.ID,
			LogLevelOption.ID,
			NameOption.ID,
			PullBatchSizeOption.ID,
			RoleOption.ID,
			SizeOption.ID,
			TimestampTypeOption.ID,
			UpdateTypeOption.ID,
		];

		const selectMenuOptions = resettableSettings.map(prop => ({ name: prop, value: prop }));
		const selectMenuTransactor = new SelectMenuTransactor(inter);
		const settingsToReset = await selectMenuTransactor.sendAndReceive("Queue settings to reset", selectMenuOptions);

		const updatedSettings = {} as any;
		for (const setting of settingsToReset) {
			const columnKey = findKey(QUEUES_TABLE, (column: SQLiteColumn) => column.name === setting);
			updatedSettings[columnKey] = (QUEUES_TABLE as any)[columnKey]?.default;
		}

		const updatedQueues = queues.map((queue) => {
			return inter.store.updateQueue({ id: queue.id, ...updatedSettings });
		});

		const settingsStr = settingsToReset.map(inlineCode).join(", ");
		const settingsWord = settingsToReset.length === 1 ? "setting" : "settings";
		const queuesStr = queuesMention(queues);
		const queuesWord = queues.size === 1 ? "queue" : "queues";
		const haveWord = settingsToReset.length === 1 ? "has" : "have";
		const resetSettingsStr = `${settingsStr} ${haveWord} been reset for ${queuesStr} ${queuesWord}.`;

		await selectMenuTransactor.updateWithResult(`Reset ${queuesWord} ${settingsWord}`, resetSettingsStr);

		DisplayUtils.requestDisplaysUpdate(inter.store, queues.map(queue => queue.id));

		await QueuesCommand.queues_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /queues delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		queue: new QueueOption({ required: true, description: "Queue to delete" }),
	};

	static async queues_delete(inter: SlashInteraction) {
		const queue = await QueuesCommand.DELETE_OPTIONS.queue.get(inter);

		const isConfirmed = await inter.promptConfirmOrCancel(`Are you sure you want to delete the '${queueMention(queue)}' queue?`);
		if (!isConfirmed) {
			return;
		}

		const deletedQueue = inter.store.deleteQueue({ id: queue.id });

		await inter.respond(`Deleted ${queueMention(deletedQueue)}.`);
	}
}
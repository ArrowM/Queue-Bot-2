import { channelMention, type Collection, SlashCommandBuilder } from "discord.js";

import type { DbDisplay, DbQueue } from "../../db/schema.ts";
import { DisplaysOption } from "../../options/options/displays.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { DisplayUtils } from "../../utils/display.utils.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { describeTable } from "../../utils/string.utils.ts";
import { ShowCommand } from "./show.command.ts";

export class DisplaysCommand extends AdminCommand {
	static readonly ID = "displays";

	displays_get = DisplaysCommand.displays_get;
	displays_add = DisplaysCommand.displays_add;
	displays_delete = DisplaysCommand.displays_delete;

	data = new SlashCommandBuilder()
		.setName(DisplaysCommand.ID)
		.setDescription("Manage display channels")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get a list of all queue displays");
			Object.values(DisplaysCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Alias for /show");
			Object.values(DisplaysCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Remove a queue display");
			Object.values(DisplaysCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /displays get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get displays of specific queue(s)" }),
	};

	static async displays_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await DisplaysCommand.GET_OPTIONS.queues.get(inter);

		let displays = [...inter.store.dbDisplays().values()];
		if (queues) {
			displays = displays.filter(display => queues.has(display.queueId));
		}

		const embeds = describeTable({
			store: inter.store,
			tableName: "Displays",
			color: Color.SkyBlue,
			mentionFn: (display: DbDisplay) => channelMention(display.displayChannelId),
			entries: displays,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /displays add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queues(s) to display" }),
	};

	static async displays_add(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await DisplaysCommand.ADD_OPTIONS.queues.get(inter);

		const { updatedQueues } = await ShowCommand.show(inter);

		await this.displays_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /displays delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		displays: new DisplaysOption({ required: true, description: "Displays to delete" }),
	};

	static async displays_delete(inter: SlashInteraction) {
		const displays = await DisplaysCommand.DELETE_OPTIONS.displays.get(inter);

		const { queuesToUpdate } = DisplayUtils.deleteDisplays(inter.store, displays.map(dis => dis.id));

		await this.displays_get(inter, toCollection<bigint, DbQueue>("id", queuesToUpdate));
	}
}

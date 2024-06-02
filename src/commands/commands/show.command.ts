import { italic, SlashCommandBuilder } from "discord.js";

import { QueuesOption } from "../../options/options/queues.option.ts";
import { EveryoneCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { DisplayUtils } from "../../utils/display.utils.ts";
import { DisplaysCommand } from "./displays.command.ts";

export class ShowCommand extends EveryoneCommand {
	static readonly ID = "show";

	show = ShowCommand.show;

	static readonly SHOW_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to display" }),
	};

	data = new SlashCommandBuilder()
		.setName(ShowCommand.ID)
		.setDescription("Show queue(s)")
		.addStringOption(ShowCommand.SHOW_OPTIONS.queues.build);

	// ====================================================================
	//                           /show
	// ====================================================================

	static async show(inter: SlashInteraction) {
		const queues = await DisplaysCommand.GET_OPTIONS.queues.get(inter);

		const result = DisplayUtils.insertDisplays(inter.store, queues, inter.channel.id);

		await inter.respond(italic("displaying..."));
		setTimeout(async () => await inter.deleteReply().catch(() => null), 2000);

		return result;
	}
}

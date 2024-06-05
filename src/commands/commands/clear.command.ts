import { SlashCommandBuilder } from "discord.js";

import { QueuesOption } from "../../options/options/queues.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { queuesMention } from "../../utils/string.utils.ts";

export class ClearCommand extends AdminCommand {
	static readonly ID = "clear";

	clear = ClearCommand.clear;

	static readonly CLEAR_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to clear" }),
	};

	data = new SlashCommandBuilder()
		.setName(ClearCommand.ID)
		.setDescription("Clear a queue. (shortcut for /members delete ALL)")
		.addStringOption(ClearCommand.CLEAR_OPTIONS.queues.build);

	// ====================================================================
	//                           /clear
	// ====================================================================

	static async clear(inter: SlashInteraction) {
		const queues = await ClearCommand.CLEAR_OPTIONS.queues.get(inter);

		const confirmed = await inter.promptConfirmOrCancel(`Are you sure you want to shuffle the '${queuesMention(queues)}' queues?`);
		if (!confirmed) return;

		queues.forEach(queue => MemberUtils.clearMembers(inter.store, queue));

		await Promise.all([
			inter.deleteReply(),
			inter.channel.send(`Cleared the ${queuesMention(queues)} queues.`),
		]);
	}
}

import { SlashCommandBuilder } from "discord.js";

import { MemberOption } from "../../options/options/member.option.ts";
import { NumberOption } from "../../options/options/number.option.ts";
import { QueueOption } from "../../options/options/queue.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { queueMention } from "../../utils/string.utils.ts";

export class MoveCommand extends AdminCommand {
	static readonly ID = "move";

	move = MoveCommand.move;

	static readonly MOVE_OPTIONS = {
		queue: new QueueOption({ required: true, description: "Queue to move member in" }),
		member: new MemberOption({ required: true, description: "Member to move" }),
		position: new NumberOption({ description: "New position of the queue member", required: true }),
	};

	data = new SlashCommandBuilder()
		.setName(MoveCommand.ID)
		.setDescription("Change the position of a queue member (same as /member set position)")
		.addStringOption(MoveCommand.MOVE_OPTIONS.member.build)
		.addIntegerOption(MoveCommand.MOVE_OPTIONS.position.build);

	// ====================================================================
	//                           /move
	// ====================================================================

	static async move(inter: SlashInteraction) {
		const queue = await MoveCommand.MOVE_OPTIONS.queue.get(inter);
		const member = await MoveCommand.MOVE_OPTIONS.member.get(inter);
		const position = MoveCommand.MOVE_OPTIONS.position.get(inter);

		MemberUtils.moveMember(inter.store, queue, member, position);

		await inter.respond({
			content: `Moved ${member.toString()} to position ${position} in the '${queueMention(queue)}' queue.`,
			ephemeral: false,
		});
	}
}
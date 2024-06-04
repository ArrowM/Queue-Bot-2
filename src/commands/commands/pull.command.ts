import { SlashCommandBuilder } from "discord.js";

import { MembersOption } from "../../options/options/members.option.ts";
import { NumberOption } from "../../options/options/number.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { NotificationType } from "../../types/notification.types.ts";
import { MemberUtils } from "../../utils/member.utils.ts";

export class PullCommand extends AdminCommand {
	static readonly ID = "pull";

	pull = PullCommand.pull;

	static readonly PULL_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue to pull members from" }),
		count: new NumberOption({ description: "Number of queue members to pull", defaultValue: 1 }),
		members: new MembersOption({ description: "Pull a specific user instead of the next user" }),
	};

	data = new SlashCommandBuilder()
		.setName(PullCommand.ID)
		.setDescription("Pull members from queue(s)")
		.addStringOption(PullCommand.PULL_OPTIONS.queues.build)
		.addIntegerOption(PullCommand.PULL_OPTIONS.count.build)
		.addStringOption(PullCommand.PULL_OPTIONS.members.build);

	// ====================================================================
	//                           /pull
	// ====================================================================

	static async pull(inter: SlashInteraction) {
		const queues = await PullCommand.PULL_OPTIONS.queues.get(inter);
		const count = PullCommand.PULL_OPTIONS.count.get(inter);
		const members = await PullCommand.PULL_OPTIONS.members.get(inter);

		if (count < 1) {
			throw new Error("Count must be a positive number.");
		}

		const pulledMembers = MemberUtils.deleteMembers({
			store: inter.store,
			queues: queues,
			by: { userIds: members?.map((member) => member.userId), count },
			notification: { type: NotificationType.PULLED_FROM_QUEUE, channelToLink: inter.channel },
			force: true,
		});

		await Promise.all([
			inter.deleteReply(),
			inter.channel.send({ embeds: MemberUtils.formatPulledMemberEmbeds(queues, pulledMembers) }),
		]);
	}
}

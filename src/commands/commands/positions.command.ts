import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { EveryoneCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { QueryUtils } from "../../utils/query.utils.ts";

export class PositionsCommand extends EveryoneCommand {
	static readonly ID = "positions";

	positions = PositionsCommand.positions;

	data = new SlashCommandBuilder()
		.setName(PositionsCommand.ID)
		.setDescription("Get your positions in all queues");

	// ====================================================================
	//                           /positions
	// ====================================================================

	static async positions(inter: SlashInteraction) {
		const userId = inter.member.id;
		const members = QueryUtils.selectManyMembers({ guildId: inter.guild.id, userId });
		const queues = members.map(member => QueryUtils.selectQueue({ id: member.queueId }));

		const embeds = await Promise.all(queues.map(queue =>
			MemberUtils.getMemberPositionString(inter.store, queue, userId),
		));

		if (!embeds.length) {
			embeds.push(new EmbedBuilder().setDescription("You are not in any queues."));
		}

		await inter.respond({ embeds });
	}
}

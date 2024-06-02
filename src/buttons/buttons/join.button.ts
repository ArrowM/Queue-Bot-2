import { ButtonStyle } from "discord.js";

import { EveryoneButton } from "../../types/button.types.ts";
import type { ButtonInteraction } from "../../types/interaction.types.ts";
import { ButtonUtils } from "../../utils/button.utils.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { queueMention } from "../../utils/string.utils.ts";

export class JoinButton extends EveryoneButton {
	static readonly ID = "join";

	customId = JoinButton.ID;
	label = "Join";
	style = ButtonStyle.Success;

	async handle(inter: ButtonInteraction) {
		const { queue } = await ButtonUtils.getButtonContext(inter);

		await MemberUtils.insertJsMember({ store: inter.store, queue, jsMember: inter.member });

		await inter.respond({
			content: `Joined '${queueMention(queue)}' queue.`,
			embeds: [await MemberUtils.getMemberPositionString(inter.store, queue, inter.member.id)],
		});
	}
}
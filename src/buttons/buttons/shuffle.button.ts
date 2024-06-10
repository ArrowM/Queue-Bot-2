import { ButtonStyle } from "discord.js";

import { AdminButton } from "../../types/button.types.ts";
import type { ButtonInteraction } from "../../types/interaction.types.ts";
import { ButtonUtils } from "../../utils/button.utils.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { queueMention } from "../../utils/string.utils.ts";

export class ShuffleButton extends AdminButton {
	static readonly ID = "shuffle";

	customId = ShuffleButton.ID;
	label = "Shuffle";
	style = ButtonStyle.Secondary;

	async handle(inter: ButtonInteraction) {
		const { queue } = await ButtonUtils.getButtonContext(inter);

		const confirmed = await inter.promptConfirmOrCancel(`Are you sure you want to shuffle the '${queueMention(queue)}' queue?`);
		if (!confirmed) return;

		MemberUtils.shuffleMembers(inter.store, queue);

		await Promise.all([
			inter.deleteReply(),
			inter.channel.send(`The '${queueMention(queue)}' queue has been shuffled.`),
		]);
	}
}
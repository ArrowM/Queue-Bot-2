import { ButtonStyle } from "discord.js";

import { AdminButton } from "../../types/button.types.ts";
import type { ButtonInteraction } from "../../types/interaction.types.ts";
import { ButtonUtils } from "../../utils/button.utils.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { queueMention } from "../../utils/string.utils.ts";

export class ClearButton extends AdminButton {
	static readonly ID = "clear";

	customId = ClearButton.ID;
	label = "Clear";
	style = ButtonStyle.Danger;

	async handle(inter: ButtonInteraction) {
		const { queue } = await ButtonUtils.getButtonContext(inter);

		if (
			!await inter.promptConfirmOrCancel(`Are you sure you want to clear the '${queueMention(queue)}'?`)
		) return;

		MemberUtils.clearMembers(inter.store, queue);
		await inter.respond({ content: `Cleared the '${queueMention(queue)}' queue.`, ephemeral: false });
	}
}
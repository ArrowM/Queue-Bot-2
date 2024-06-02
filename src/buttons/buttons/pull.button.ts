import { ButtonStyle } from "discord.js";

import { AdminButton } from "../../types/button.types.ts";
import type { ButtonInteraction } from "../../types/interaction.types.ts";
import { NotificationType } from "../../types/notification.types.ts";
import { ButtonUtils } from "../../utils/button.utils.ts";
import { MemberUtils } from "../../utils/member.utils.ts";

export class PullButton extends AdminButton {
	static readonly ID = "pull";

	customId = PullButton.ID;
	label = "Pull";
	style = ButtonStyle.Secondary;

	async handle(inter: ButtonInteraction) {
		const { queue } = await ButtonUtils.getButtonContext(inter);
		const pulledMembers = MemberUtils.deleteMembers({
			store: inter.store,
			queues: [queue],
			by: { },
			notification: { type: NotificationType.PULLED_FROM_QUEUE, channelToLink: inter.channel },
		});
		const embeds = MemberUtils.formatPulledMemberEmbeds([queue], pulledMembers);

		await inter.respond({ embeds: embeds, ephemeral: false });
	}
}
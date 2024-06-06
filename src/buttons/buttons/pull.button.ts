import { ButtonStyle } from "discord.js";

import { AdminButton } from "../../types/button.types.ts";
import { ArchivedMemberReason } from "../../types/db.types.ts";
import type { ButtonInteraction } from "../../types/interaction.types.ts";
import { NotificationType } from "../../types/notification.types.ts";
import { ButtonUtils } from "../../utils/button.utils.ts";
import { MemberUtils } from "../../utils/member.utils.ts";

export class PullButton extends AdminButton {
	static readonly ID = "pull";

	customId = PullButton.ID;
	label = "Pull";
	style = ButtonStyle.Primary;

	async handle(inter: ButtonInteraction) {
		const { queue } = await ButtonUtils.getButtonContext(inter);

		const pulledMembers = await MemberUtils.deleteMembers({
			store: inter.store,
			queues: [queue],
			reason: ArchivedMemberReason.Pulled,
			notification: { type: NotificationType.PULLED_FROM_QUEUE, channelToLink: inter.channel },
			force: true,
		});

		await Promise.all([
			inter.deleteReply(),
			inter.channel.send({ embeds: MemberUtils.formatPulledMemberEmbeds([queue], pulledMembers) }),
		]);
	}
}
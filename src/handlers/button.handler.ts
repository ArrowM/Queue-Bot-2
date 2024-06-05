import type { InteractionReplyOptions, MessagePayload } from "discord.js";

import { BUTTONS } from "../buttons/buttons.loader.ts";
import { incrementGuildStat } from "../db/db.ts";
import type { Handler } from "../types/handler.types.ts";
import type { AnyInteraction, ButtonInteraction } from "../types/interaction.types.ts";
import { AdminUtils } from "../utils/admin.utils.ts";
import { InteractionUtils } from "../utils/interaction.utils.ts";

export class ButtonHandler implements Handler {
	private readonly inter: ButtonInteraction;

	constructor(inter: AnyInteraction) {
		this.inter = inter as ButtonInteraction;
		this.inter.respond = (options: (InteractionReplyOptions | string | MessagePayload)) => InteractionUtils.respond(this.inter, options);
	}

	async handle() {
		await this.inter.deferReply({ ephemeral: true });
		const button = BUTTONS.get(this.inter.customId);
		if (button) {
			if (button.adminOnly) AdminUtils.verifyIsAdmin(this.inter.store, this.inter.member);
			incrementGuildStat(this.inter.guildId, "buttonsReceived");
			await button.handle(this.inter);
		}
	}
}
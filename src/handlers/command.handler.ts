import { type InteractionReplyOptions, MessagePayload } from "discord.js";

import { COMMANDS } from "../commands/commands.loader.ts";
import { incrementGuildStat } from "../db/queries.ts";
import type { Handler } from "../types/handler.types.ts";
import type { AnyInteraction, SlashInteraction } from "../types/interaction.types.ts";
import { AdminUtils } from "../utils/admin.utils.ts";
import { InteractionUtils } from "../utils/interaction.utils.ts";
import { Parser } from "../utils/message-utils/parser.ts";

export class CommandHandler implements Handler {
	private readonly inter: SlashInteraction;

	constructor(inter: AnyInteraction) {
		this.inter = inter as SlashInteraction;
		this.inter.parser = new Parser(this.inter);
		this.inter.promptConfirmOrCancel = (message: string) => InteractionUtils.promptConfirmOrCancel(this.inter, message);
		this.inter.respond = (options: (InteractionReplyOptions | string | MessagePayload)) => InteractionUtils.respond(this.inter, options);
	}

	async handle() {
		await this.inter.deferReply({ ephemeral: true });

		const subcommandName = (this.inter.options as any)._subcommand;
		const fullCommandName = `${this.inter.commandName}${subcommandName ? `_${subcommandName}` : ""}`;
		const command = COMMANDS.get(this.inter.commandName);

		if (command) {
			if (command.adminOnly) AdminUtils.verifyIsAdmin(this.inter.store, this.inter.member);

			if (fullCommandName in command) {
				incrementGuildStat(this.inter.guildId, "commandsReceived");
				await (command as any)[fullCommandName](this.inter);
			}
			else {
				throw new Error(`Could not find ${fullCommandName}()`);
			}
		}
	}
}
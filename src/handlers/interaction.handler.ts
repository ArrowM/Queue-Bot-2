import { codeBlock, EmbedBuilder, type Interaction } from "discord.js";

import { Store } from "../core/store.ts";
import type { Handler } from "../types/handler.types.ts";
import type { AnyInteraction } from "../types/interaction.types.ts";
import { CustomError } from "../utils/error.utils.ts";
import { InteractionUtils } from "../utils/interaction.utils.ts";
import { ERROR_HEADER_LINE } from "../utils/string.utils.ts";
import { AutocompleteHandler } from "./autocomplete.handler.ts";
import { ButtonHandler } from "./button.handler.ts";
import { CommandHandler } from "./command.handler.ts";

export class InteractionHandler implements Handler {
	private readonly inter: AnyInteraction;

	constructor(inter: Interaction) {
		InteractionUtils.verifyCommandIsFromGuild(inter);
		this.inter = inter as any as AnyInteraction;
		this.inter.store = new Store(this.inter.guild, this.inter.member);
	}

	async handle() {
		try {
			if (this.inter.isChatInputCommand()) {
				await new CommandHandler(this.inter).handle();
			}
			else if (this.inter.isAutocomplete()) {
				await new AutocompleteHandler(this.inter).handle();
			}
			else if (this.inter.isButton()) {
				await new ButtonHandler(this.inter).handle();
			}
		}
		catch (e) {
			await this.handleInteractionError(e as Error);
		}
	}

	private async handleInteractionError(error: Error) {
		const { message, stack, extraEmbeds, log } = error as CustomError;

		if (message === "Unknown interaction") return;

		try {
			const embeds: EmbedBuilder[] = [
				new EmbedBuilder()
					.setTitle(ERROR_HEADER_LINE)
					.setDescription(message ? `${codeBlock(message)}` : "")
					.setFooter({ text: "This error has been logged and will be investigated by the developers." }),
			];

			if (extraEmbeds) {
				embeds.push(...extraEmbeds);
			}

			if ("respond" in this.inter) {
				await this.inter.respond({ embeds, ephemeral: true });
			}

			if (log !== false) {
				console.error(`Error: ${message}`);
				console.error(`Stack Trace: ${stack}`);
			}
		}
		catch (handlingError) {
			console.log();
			console.log("An Error occurred during handling of another error:");
			console.error(handlingError);
		}
	}
}
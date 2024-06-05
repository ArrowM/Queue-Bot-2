import { codeBlock, EmbedBuilder, type Interaction } from "discord.js";

import { Store } from "../core/store.ts";
import type { Handler } from "../types/handler.types.ts";
import type { AnyInteraction } from "../types/interaction.types.ts";
import type { CustomError } from "../utils/error.utils.ts";
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
		this.inter.store = new Store(this.inter.guild);
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

	private async handleInteractionError(error: CustomError) {
		if (error.message === "Unknown interaction") return;
		try {
			// TODO disable error log
			console.error(`Error: ${(error as Error).message}`);
			console.error(`Stack Trace: ${(error as Error).stack}`);

			const embeds: EmbedBuilder[] = [];
			embeds.push(
				new EmbedBuilder()
					.setTitle(ERROR_HEADER_LINE)
					.setDescription(error.message ? `${codeBlock(error.message)}\n` : ""),
			);
			if (error.extraEmbeds) {
				embeds.push(...error.extraEmbeds);
			}

			const response = { embeds, ephemeral: true } as any;
			if ("respond" in this.inter) {
				await this.inter.respond(response);
			}
		}
		catch (handlingError) {
			console.log();
			console.log("An Error occurred during handling of another error:");
			console.error(handlingError);
		}
	}
}
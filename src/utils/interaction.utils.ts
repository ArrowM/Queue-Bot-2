import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	type Interaction,
	type InteractionReplyOptions,
	MessagePayload,
} from "discord.js";

import type { AnyInteraction, SlashInteraction } from "../types/interaction.types.ts";

export namespace InteractionUtils {
	export async function respond(inter: AnyInteraction, response: (InteractionReplyOptions | string | MessagePayload)) {
		if (typeof response === "string") {
			response = { content: response, embeds: [] };
		}
		else if ("content" in response || "embeds" in response) {
			response = {
				...response,
				content: response.content ?? "",
				embeds: response.embeds ?? [],
				components: response.components ?? [],
			};
		}

		const interaction = inter as any;
		if (interaction.deferred) {
			return await interaction.editReply(response);
		}
		else if (interaction.replied) {
			return await interaction.followUp(response);
		}
		else {
			return await (await interaction.reply(response)).fetch();
		}
	}

	export async function promptConfirmOrCancel(inter: SlashInteraction, message: string): Promise<boolean> {
		const confirm = new ButtonBuilder()
			.setCustomId("confirm")
			.setLabel("Confirm")
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Secondary);

		const response = await inter.respond({
			content: message,
			embeds: [],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(cancel, confirm),
			],
		});
		let confirmation;

		try {
			confirmation = await response.awaitMessageComponent<ComponentType.Button>({
				filter: i => i.user.id === inter.user.id,
				time: 60_000,
			});
		}
		catch {
			// nothing
		}
		finally {
			// Cleanup messages
			await Promise.all([
				confirmation.deleteReply(),
				inter.editReply({ components: [] }),
			]);
		}

		return confirmation.customId === "confirm";
	}

	export function verifyCommandIsFromGuild(inter: Interaction) {
		if (!inter.guild) {
			throw new Error("This command can only be used in a guild.");
		}
	}
}

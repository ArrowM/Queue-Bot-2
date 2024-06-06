import {
	ActionRowBuilder,
	bold,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	type GuildTextBasedChannel,
	inlineCode,
	type Interaction,
	type InteractionReplyOptions,
	MessagePayload,
	PermissionsBitField,
} from "discord.js";

import { Color } from "../types/db.types.ts";
import type { AnyInteraction, SlashInteraction } from "../types/interaction.types.ts";
import { CustomError } from "./error.utils.ts";

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

	export async function verifyCanSendMessages(jsChannel: GuildTextBasedChannel) {
		function throwError(permissionName: string) {
			throw new CustomError("Missing Permissions",
				[
					new EmbedBuilder()
						.setTitle(`⚠️ I am missing the ${inlineCode(permissionName)} permission in ${jsChannel} ⚠️ ️️️️`)
						.setDescription(`Please open the '${bold(jsChannel.guild.name)}' server, hover over ${jsChannel}, click the gear, click 'Permissions', and ensure I have the ${inlineCode(permissionName)} permission.`)
						.setColor(Color.Red)],
			);
		}

		const me = await jsChannel.guild.members.fetchMe();
		const perms = jsChannel?.permissionsFor(me);
		if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) {
			throwError("View Channel");
		}
		if (!perms?.has(PermissionsBitField.Flags.SendMessages)) {
			throwError("Send Messages");
		}
	}
}

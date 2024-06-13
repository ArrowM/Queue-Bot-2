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
	type Message,
	messageLink,
	PermissionsBitField,
} from "discord.js";

import { Color, LogScope } from "../types/db.types.ts";
import type { AnyInteraction, SlashInteraction } from "../types/interaction.types.ts";
import { CustomError } from "./error.utils.ts";

export namespace InteractionUtils {
	export async function respond(inter: AnyInteraction, isAdmin: boolean, response: (InteractionReplyOptions | string), log = false) {
		const interaction = inter as any;

		let result: Message;

		if (typeof response === "object" && "ephemeral" in response && response.ephemeral === false) {
			await Promise.all([
				interaction.deleteReply(),
				result = interaction.channel.send(response),
			]);
		}
		else if (interaction.replied) {
			result = await interaction.followUp(response);
		}
		else if (interaction.deferred) {
			result = await interaction.editReply(response);
		}
		else {
			result = await (await interaction.reply(response)).fetch();
		}

		if (log) {
			await logResponse(inter, isAdmin, response, result);
		}

		return result;
	}

	const CANCEL_BUTTON = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Secondary);

	const CONFIRM_BUTTON = new ButtonBuilder()
		.setCustomId("confirm")
		.setLabel("Confirm")
		.setStyle(ButtonStyle.Danger);

	export async function promptConfirmOrCancel(inter: SlashInteraction, message: string): Promise<boolean> {
		const response = await inter.respond({
			content: message,
			components: [
				new ActionRowBuilder<ButtonBuilder>({ components: [ CANCEL_BUTTON, CONFIRM_BUTTON ] }),
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
				confirmation?.deleteReply(),
				inter.editReply({ components: [] }),
			]);
		}

		return confirmation?.customId === "confirm";
	}

	export function verifyCommandIsFromGuild(inter: Interaction) {
		if (!inter.guild) {
			throw new Error("This command can only be used in servers");
		}
	}

	export async function verifyCanSendMessages(jsChannel: GuildTextBasedChannel) {
		function throwPermissionError(permissionName: string) {
			throw new CustomError({
				message: "Missing Permissions",
				embeds: [
					new EmbedBuilder()
						.setTitle(`⚠️ I am missing the ${inlineCode(permissionName)} permission in ${jsChannel} ⚠️ ️️️️`)
						.setDescription(`Please open the '${bold(jsChannel.guild.name)}' server, hover over ${jsChannel}, click the gear, click 'Permissions', and ensure I have the ${inlineCode(permissionName)} permission.`)
						.setColor(Color.Red),
				],
			});
		}

		const me = await jsChannel.guild.members.fetchMe();
		const perms = jsChannel?.permissionsFor(me);
		if (!perms?.has(PermissionsBitField.Flags.ViewChannel)) {
			throwPermissionError("View Channel");
		}
		if (!perms?.has(PermissionsBitField.Flags.SendMessages)) {
			throwPermissionError("Send Messages");
		}
	}

	async function logResponse(inter: AnyInteraction, isAdmin: boolean, response: (InteractionReplyOptions | string), result: Message) {
		const { logChannelId, logScope } = inter.store.dbGuild();
		const logChannel = await inter.store.jsChannel(logChannelId) as GuildTextBasedChannel;

		if (!logChannel) return;

		if (typeof response === "string") {
			response = { content: response };
		}

		response.content = messageLink(result.channelId, result.id) + " " + response.content;

		if (
			isAdmin && ([LogScope.Admin, LogScope.All].includes(logScope)) ||
			!isAdmin && ([LogScope.NonAdmin, LogScope.All].includes(logScope))
		) {
			await logChannel.send(response as any);
		}
	}
}

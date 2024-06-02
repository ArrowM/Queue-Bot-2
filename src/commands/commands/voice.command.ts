import { SlashCommandBuilder } from "discord.js";

import { DestinationVoiceChannelOption } from "../../options/options/destination-voice-channel.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { SourceVoiceChannelOption } from "../../options/options/source-voice-channel.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";

export class VoiceCommand extends AdminCommand {
	static readonly ID = "voice";

	voice_get = VoiceCommand.voice_get;
	voice_add = VoiceCommand.voice_add;
	voice_delete = VoiceCommand.voice_delete;

	data = new SlashCommandBuilder()
		.setName(VoiceCommand.ID)
		.setDescription("Manage voice integrations")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get voice integrations");
			Object.values(VoiceCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Add voice integrations");
			Object.values(VoiceCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Delete voice integrations");
			Object.values(VoiceCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /voice get
	// ====================================================================

	// TODO redo all of these to be like sch,bl,wl,pr

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Get voice integrations of specific queue(s)" }),
	};

	static async voice_get(inter: SlashInteraction) {
		const queues = await VoiceCommand.GET_OPTIONS.queues.get(inter);

		await inter.respond("Not implemented.");

		// const embeds: EmbedBuilder[] = [];
		// queues.forEach(queue => {
		// 	const { sourceVoiceChannelId, destinationVoiceChannelId } = queue;
		//
		// 	const embed = new EmbedBuilder().setTitle(queueMention(queue));
		//
		// 	if (sourceVoiceChannelId && destinationVoiceChannelId) {
		// 		embed.setDescription(`${channelMention(sourceVoiceChannelId)} ⇒ ${channelMention(destinationVoiceChannelId)}`);
		// 	}
		// 	else {
		// 		embed.setDescription("No voice integration.");
		// 	}
		//
		// 	embeds.push(embed);
		// });
		//
		// if (!embeds.length) {
		// 	embeds.push(new EmbedBuilder().setDescription("No voice integrations."));
		// }
		//
		// await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /voice add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to integrate with voice" }),
		sourceVoiceChannel: new SourceVoiceChannelOption({ required: true, description: "Voice channel to pull members from" }),
		destinationVoiceChannel: new DestinationVoiceChannelOption({ required: true, description: "Voice channel to push members to" }),
	};

	static async voice_add(inter: SlashInteraction) {
		const queues = await VoiceCommand.ADD_OPTIONS.queues.get(inter);
		const sourceVoiceChannel = VoiceCommand.ADD_OPTIONS.sourceVoiceChannel.get(inter);
		const destinationVoiceChannel = VoiceCommand.ADD_OPTIONS.destinationVoiceChannel.get(inter);

		await inter.respond("Not implemented.");

	}

	// ====================================================================
	//                           /voice delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to integrate with voice" }),
	};

	static async voice_delete(inter: SlashInteraction) {
		const queues = await VoiceCommand.DELETE_OPTIONS.queues.get(inter);

		await inter.respond("Not implemented.");

	}
}

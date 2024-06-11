import { channelMention, type Collection, SlashCommandBuilder } from "discord.js";

import type { DbQueue, DbVoice } from "../../db/schema.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { VoiceDestinationChannelOption } from "../../options/options/voice-destination-channel.option.ts";
import { VoiceSourceChannelOption } from "../../options/options/voice-source-channel.option.ts";
import { VoicesOption } from "../../options/options/voices.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { ArchivedMemberReason, Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { MemberUtils } from "../../utils/member.utils.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { describeTable, queueMention } from "../../utils/string.utils.ts";
import { VoiceUtils } from "../../utils/voice.utils.ts";

export class VoiceCommand extends AdminCommand {
	static readonly ID = "voice";

	voice_get = VoiceCommand.voice_get;
	voice_add = VoiceCommand.voice_add;
	voice_update = VoiceCommand.voice_update;
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

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Get voice integrations of specific queue(s)" }),
	};

	static async voice_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await VoiceCommand.GET_OPTIONS.queues.get(inter);

		const voices = inter.store.dbVoices().filter(voice => queues.has(voice.queueId));

		const embeds = describeTable({
			store: inter.store,
			tableName: "Voice integrations",
			color: Color.Purple,
			entries: [...voices.values()],
			mentionFn: (voice: DbVoice) => `${channelMention(voice.sourceChannelId)} -> ${channelMention(voice.destinationChannelId)}`,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /voice add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to integrate with voice" }),
		sourceVoiceChannel: new VoiceSourceChannelOption({ required: true, description: "Voice channel to pull members from" }),
		destinationVoiceChannel: new VoiceDestinationChannelOption({ required: true, description: "Voice channel to push members to" }),
	};

	static async voice_add(inter: SlashInteraction) {
		const queues = await VoiceCommand.ADD_OPTIONS.queues.get(inter);
		const sourceVoiceChannel = VoiceCommand.ADD_OPTIONS.sourceVoiceChannel.get(inter);
		const destinationVoiceChannel = VoiceCommand.ADD_OPTIONS.destinationVoiceChannel.get(inter);

		for (const queue of queues.values()) {
			const members = inter.store.dbMembers().filter(member => member.queueId === queue.id);
			if (members.size) {
				const confirmed = await inter.promptConfirmOrCancel(
					`There are ${members.size} member${members.size === 1 ? "" : "s"} in the queue${members.size === 1 ? "" : "s"} ${queueMention(queue)} that will be cleared if you proceed. Do you want to proceed?`,
				);
				if (confirmed) {
					await MemberUtils.deleteMembers({ store: inter.store, queues: [queue], reason: ArchivedMemberReason.Kicked });
				}
			}
		}

		const {
			updatedQueueIds,
		} = VoiceUtils.insertVoices(inter.store, queues, sourceVoiceChannel.id, destinationVoiceChannel.id);
		const updatedQueues = updatedQueueIds.map(id => inter.store.dbQueues().get(id));

		await inter.respond(`Added voice integrations to ${updatedQueues.length} queue${updatedQueues.length ? "s" : ""}`);
		await this.voice_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /voice update
	// ====================================================================

	static readonly UPDATE_OPTIONS = {
		voices: new VoicesOption({ required: true, description: "Voice integrations to update" }),
		sourceVoiceChannel: new VoiceSourceChannelOption({
			required: false,
			description: "Voice channel to pull members from",
		}),
		destinationVoiceChannel: new VoiceDestinationChannelOption({
			required: false,
			description: "Voice channel to push members to",
		}),
	};

	static async voice_update(inter: SlashInteraction) {
		const voices = await VoiceCommand.UPDATE_OPTIONS.voices.get(inter);
		const sourceVoiceChannel = VoiceCommand.UPDATE_OPTIONS.sourceVoiceChannel.get(inter);
		const destinationVoiceChannel = VoiceCommand.UPDATE_OPTIONS.destinationVoiceChannel.get(inter);

		const {
			updatedQueueIds,
		} = VoiceUtils.updateVoices(inter.store, voices.map(voice => voice.id), {
			sourceChannelId: sourceVoiceChannel?.id,
			destinationChannelId: destinationVoiceChannel?.id,
		});
		const updatedQueues = updatedQueueIds.map(id => inter.store.dbQueues().get(id));

		await inter.respond(`Updated voice integrations in ${updatedQueues.length} queue${updatedQueues.length ? "s" : ""}`);
		await this.voice_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /voice delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		voices: new VoicesOption({ required: true, description: "Voice integrations to delete" }),
	};

	static async voice_delete(inter: SlashInteraction) {
		const voices = await VoiceCommand.DELETE_OPTIONS.voices.get(inter);

		const {
			updatedQueueIds,
		} = VoiceUtils.deleteVoices(inter.store, voices.map(voice => voice.id));
		const updatedQueues = updatedQueueIds.map(id => inter.store.dbQueues().get(id));

		await inter.respond(`Deleted voice integrations in ${updatedQueues.length} queue${updatedQueues.length ? "s" : ""}`);
		await this.voice_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}
}

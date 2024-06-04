import type { RestOrArray } from "@discordjs/builders";
import {
	ActionRowBuilder,
	type APIEmbedField,
	bold,
	ButtonBuilder,
	channelMention, type Collection,
	EmbedBuilder,
	type GuildBasedChannel,
	type GuildMember,
	type GuildTextBasedChannel,
	inlineCode,
	type Message,
	PermissionsBitField, type Snowflake,
	time,
	type TimestampStylesString,
} from "discord.js";

import { BUTTONS } from "../buttons/buttons.loader.ts";
import { JoinButton } from "../buttons/buttons/join.button.ts";
import { LeaveButton } from "../buttons/buttons/leave.button.ts";
import { MyPositionsButton } from "../buttons/buttons/my-positions.button.ts";
import { PullButton } from "../buttons/buttons/pull.button.ts";
import type { Store } from "../core/store.ts";
import { type DbMember, type DbQueue } from "../db/schema.ts";
import type { Button } from "../types/button.types.ts";
import { DisplayUpdateType, MemberDisplayType, TimestampType } from "../types/db.types.ts";
import { map } from "./misc.utils.ts";
import {
	commandMention,
	convertSecondsToMinutesAndSeconds,
	ERROR_HEADER_LINE,
	queueMemberMention,
	queueMention, scheduleMention,
} from "./string.utils.ts";

export namespace DisplayUtils {
	const UPDATED_QUEUE_IDS = new Map<bigint, Store>();
	const PENDING_QUEUE_IDS = new Map<bigint, Store>();

	setInterval(() => {
		PENDING_QUEUE_IDS.forEach((store, queueId) =>
			updateDisplays(store, queueId)
		);
		UPDATED_QUEUE_IDS.clear();
		PENDING_QUEUE_IDS.clear();
	}, 1500);

	export function requestDisplayUpdate(store: Store, queueId: bigint, forceNew?: boolean) {
		if (UPDATED_QUEUE_IDS.has(queueId)) {
			PENDING_QUEUE_IDS.set(queueId, store);
		}
		else {
			updateDisplays(store, queueId, forceNew);
		}
	}

	export function requestDisplaysUpdate(store: Store, queueIds: bigint[], forceNew?: boolean) {
		return map(queueIds, id => requestDisplayUpdate(store, id, forceNew));
	}

	export function insertDisplays(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, displayChannelId: Snowflake) {
		// insert into db
		const insertedDisplays = map(queues, (queue) => store.insertDisplay({
			guildId: store.guild.id,
			queueId: queue.id,
			displayChannelId,
		}));

		// We reset the member cache in case the bot has missed a member leaving the guild
		store.guild.members.cache.clear();

		// update displays
		const queuesToUpdate = insertedDisplays.map(display => display.queueId
			? store.dbQueues().get(display.queueId)
			: [...store.dbQueues().values()]
		).flat();
		DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id), true);

		return { insertedDisplays, updatedQueues: queuesToUpdate };
	}

	export function deleteDisplays(store: Store, displayIds: bigint[]) {
		// delete from db
		const deletedDisplays = displayIds.map(displayId =>
			store.deleteDisplay({ id: displayId })
		);

		// update displays
		const queuesToUpdate = deletedDisplays.map(display => display.queueId
			? store.dbQueues().get(display.queueId)
			: [...store.dbQueues().values()]
		).flat();
		deletedDisplays.forEach(display => store.deleteDisplay(display));
		requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id));

		return { deletedDisplays, queuesToUpdate };
	}

	export function createMemberDisplayLine(
		queue: DbQueue,
		member: DbMember,
		jsMember: GuildMember,
		position: number,
		rightPadding = 0,
	): string {
		const idxStr = inlineCode(position.toString().padEnd(rightPadding));
		const timeStr = (queue.timestampType !== TimestampType.Off)
			? time(new Date(Number(member.joinTime)), queue.timestampType as TimestampStylesString)
			: "";
		const prioStr = member.isPrioritized ? "✨" : "";
		const nameStr = queueMemberMention(jsMember, queue.memberDisplayType);
		const msgStr = member.message ? ` -- ${member.message}` : "";

		return `${idxStr}${timeStr}${prioStr}${nameStr}${msgStr}\n`;
	}

	async function updateDisplays(store: Store, queueId: bigint, forceNew = false) {
		try {
			UPDATED_QUEUE_IDS.set(queueId, store);

			const queue = store.dbQueues().get(queueId);
			const displays = store.dbDisplays().filter(display => queue.id === display.queueId);

			const embedBuilders = await generateQueueDisplay(store, queue);

			// Send update

			await Promise.all(displays.map(async (display) => {
				try {
					const jsChannel = await store.jsChannel(display.displayChannelId) as GuildTextBasedChannel;
					const perms = jsChannel?.permissionsFor(await jsChannel.guild.members.fetchMe());
					const canSend = perms?.has(PermissionsBitField.Flags.SendMessages) && perms?.has(PermissionsBitField.Flags.EmbedLinks);
					if (!canSend) {
						throw new Error(`Missing permissions to send messages or embed links in ${jsChannel}.`);
					}

					let lastMessage: Message;
					if (display.lastMessageId) {
						lastMessage = await jsChannel.messages.fetch(display.lastMessageId).catch(() => null as Message);
					}

					async function newDisplay() {
						// Send new display
						const message = await jsChannel.send({
							embeds: embedBuilders,
							components: getButtonRow(queue),
							allowedMentions: { users: [] },
						}).catch(console.error);
						if (message) {
							// Remove buttons on the previous message
							await lastMessage?.edit({
								embeds: embedBuilders,
								components: [],
								allowedMentions: { users: [] },
							}).catch(console.error);
							// Update the display
							store.updateDisplay({
								guildId: store.guild.id,
								id: display.id,
								lastMessageId: message.id,
							});
						}
					}

					async function editDisplay() {
						if (lastMessage) {
							await lastMessage.edit({
								embeds: embedBuilders,
								components: lastMessage.components,
								allowedMentions: { users: [] },
							}).catch(console.error);
						}
						else {
							await newDisplay();
						}
					}

					async function replaceDisplay() {
						await lastMessage?.delete().catch(console.error);
						await newDisplay();
					}

					if (queue.updateType === DisplayUpdateType.New || forceNew) {
						await newDisplay();
					}
					else if (queue.updateType === DisplayUpdateType.Edit) {
						await editDisplay();
					}
					else if (queue.updateType === DisplayUpdateType.Replace) {
						await replaceDisplay();
					}
				}
				catch (e: any) {
					// TODO disable error log
					console.error(e);
				}
			}));

			store.incrementGuildStat("displaysSent", displays.size);
		}
		catch (e: any) {
			// TODO disable error log
			console.error(e);
		}
	}

	async function generateQueueDisplay(store: Store, queue: DbQueue): Promise<EmbedBuilder[]> {
		const members = store.dbMembers().filter(member => member.queueId === queue.id);
		const jsMembers = await store.jsMembers(members.map(member => member.userId));
		const { color, inlineToggle, memberDisplayType, sourceVoiceChannelId, destinationVoiceChannelId } = queue;
		let sourceVoiceChannel, destinationVoiceChannel;
		const title = queueMention(queue);
		const rightPadding = members.size.toString().length;

		// Get voice channels if applicable
		if (sourceVoiceChannelId && destinationVoiceChannelId) {
			sourceVoiceChannel = await store.jsChannel(sourceVoiceChannelId);
			destinationVoiceChannel = await store.jsChannel(destinationVoiceChannelId);
			if (!sourceVoiceChannel || !destinationVoiceChannel) {
				let errorMessage = ERROR_HEADER_LINE + "\n";
				if (!sourceVoiceChannel) {
					errorMessage += `Source voice channel ${channelMention(sourceVoiceChannelId)} not found.`;
				}
				if (!destinationVoiceChannel) {
					errorMessage += `Destination voice channel ${channelMention(destinationVoiceChannelId)} not found.`;
				}
				return [
					new EmbedBuilder()
						.setTitle(queueMention(queue))
						.setColor(color)
						.setDescription(errorMessage),
				];
			}
		}

		// Build member strings
		const memberDisplayLines: string[] = [];
		[...members.values()].forEach((member, position) => {
			const jsMember = memberDisplayType === MemberDisplayType.Mention ? jsMembers.get(member.userId) : null;

			if (memberDisplayType === MemberDisplayType.Mention && !jsMember) {
				store.deleteMember({ queueId: member.queueId, userId: member.userId });
			}
			else {
				memberDisplayLines.push(createMemberDisplayLine(queue, member, jsMember, position + 1, rightPadding));
			}
		});

		/**
		 * Q: What is happening below?
		 * A: Discord has a limit of 6000 characters for a single message.
		 * 		If the queue is too long, we need to split it into multiple messages.
		 * 	  Discord.js does not automatically split messages for us, so we need to do it manually.
		 */

		// Build embeds
		const description = await buildDescription(store, queue, sourceVoiceChannel, destinationVoiceChannel);
		const sizeStr = `size: ${memberDisplayLines.length}${queue.size ? ` / ${queue.size}` : ""}`;
		const embedBuilders: EmbedBuilder[] = [];
		let fields: RestOrArray<APIEmbedField> = [];
		let fieldIdx = 1;
		let embedLength = title.length + description.length + sizeStr.length;

		function createEmbed(fields: RestOrArray<APIEmbedField>): EmbedBuilder {
			return new EmbedBuilder()
				.setTitle(title)
				.setColor(color)
				.setDescription(description)
				.setFields(...fields);
		}

		function createField(): APIEmbedField {
			return { name: "\u200b", value: "", inline: inlineToggle };
		}

		let field = createField();

		for (let i = 0; i < memberDisplayLines.length; i++) {
			const memberDisplayLine = memberDisplayLines[i];
			if ((embedLength + memberDisplayLine.length >= 6000) || fieldIdx === 25) {
				embedBuilders.push(createEmbed(fields));
				fields = [];
				field = createField();
				fieldIdx = 1;
			}
			if (field.value.length + memberDisplayLine.length >= 1024) {
				fields.push(field);
				field = createField();
				fieldIdx++;
			}
			field.value += memberDisplayLine;
			embedLength += memberDisplayLine.length;
		}

		if (!field.value) {
			field.value = "\u200b";
		}
		fields.push(field);
		fields[0].name = sizeStr;

		embedBuilders.push(createEmbed(fields));

		return embedBuilders;
	}

	async function buildDescription(store: Store, queue: DbQueue, sourceVoiceChannel: GuildBasedChannel, destinationVoiceChannel: GuildBasedChannel) {
		const schedules = store.dbSchedules().filter(schedule => queue.id === schedule.queueId);
		const members = store.dbMembers().filter(member => member.queueId === queue.id);
		const { lockToggle, header, gracePeriod, autopullToggle } = queue;
		const descriptionParts = [];

		if (header) {
			descriptionParts.push(`${header}\n`);
		}

		if (lockToggle) {
			descriptionParts.push("Queue is locked.");
		}
		else {
			if (sourceVoiceChannel && destinationVoiceChannel) {
				descriptionParts.push(
					`Join ${sourceVoiceChannel} to enter the queue.\n` +
					`${autopullToggle ? "Automatically pulling" : "Manually pulling"} members from ${sourceVoiceChannel} to ${destinationVoiceChannel}.`,
				);
			}
			else if (queue.buttonsToggle) {
				descriptionParts.push(`Use ${commandMention("join")}, ${commandMention("leave")}, or the buttons below.`);
			}
			else {
				descriptionParts.push(`Use ${commandMention("join")} or ${commandMention("leave")}.`);
			}

			if (gracePeriod) {
				descriptionParts.push(`If you leave, you have ${bold(convertSecondsToMinutesAndSeconds(gracePeriod))} to reclaim your spot.`);
			}
		}

		if (members.some(m => m.isPrioritized)) {
			descriptionParts.push("Priority users are marked with a ✨.");
		}

		if (schedules.size) {
			descriptionParts.push(schedules.map(scheduleMention).sort().join("\n"));
		}

		return descriptionParts.join("\n");
	}

	function buildButton(button: Button) {
		return new ButtonBuilder()
			.setCustomId(button.customId)
			.setLabel(button.label)
			.setStyle(button.style);
	}

	function getButtonRow(queue: DbQueue) {
		if (queue.buttonsToggle) {
			const actionRowBuilder = new ActionRowBuilder<ButtonBuilder>();
			if (!queue.sourceVoiceChannelId) {
				actionRowBuilder.addComponents(
					buildButton(BUTTONS.get(JoinButton.ID)),
					buildButton(BUTTONS.get(LeaveButton.ID)),
				);
			}
			actionRowBuilder.addComponents(
				buildButton(BUTTONS.get(MyPositionsButton.ID)),
				buildButton(BUTTONS.get(PullButton.ID)),
				// buildButton(BUTTONS.get(ClearButton.ID)),
				// buildButton(BUTTONS.get(ShuffleButton.ID)),
			);
			return [actionRowBuilder.toJSON()];
		}
	}
}
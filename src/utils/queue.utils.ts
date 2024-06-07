import { bold, channelMention, inlineCode, roleMention, strikethrough } from "discord.js";
import { compact, isNil, omit } from "lodash-es";

import { type DbQueue, type DbVoice, QUEUE_TABLE } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import { MemberUtils } from "./member.utils.ts";

export namespace QueueUtils {
	const INDESCRIBABLE_QUEUE_PROPERTIES = ["id", "name", "guildId", "queueId"];

	type FormattingFunctions = Partial<Record<keyof DbQueue | keyof DbVoice, (value: any) => string>>;
	const formattingFunctions: FormattingFunctions = {
		logChannelId: channelMention,
		roleId: roleMention,
		sourceChannelId: channelMention,
		destinationChannelId: channelMention,
	};

	export function describeQueue(store: Store, queue: DbQueue) {
		const describableProperties = omit(queue, INDESCRIBABLE_QUEUE_PROPERTIES);

		const propertyStrings = Object.keys(describableProperties).map(property => describeProperty(queue, property));

		const voice = store.dbVoices().find(voice => voice.queueId === queue.id);
		if (voice) {
			propertyStrings.push(`- voice_source_channel = ${channelMention(voice.sourceChannelId)}`);
			propertyStrings.push(`- voice_destination_channel = ${channelMention(voice.destinationChannelId)}`);
		}

		return compact(propertyStrings).join("\n");
	}

	export function validateQueueProperties(queue: Partial<DbQueue>) {
		if (queue.gracePeriod && queue.gracePeriod < 0) {
			throw new Error("Grace period must be a positive number.");
		}
		if (queue.pullBatchSize && queue.pullBatchSize < 1) {
			throw new Error("Pull batch size must be a positive number.");
		}
		if (queue.size && queue.size < 1) {
			throw new Error("Size must be a positive number.");
		}
	}

	export async function addQueueRole(store: Store, queue: DbQueue) {
		const memberIds = store.dbMembers()
			.filter(member => member.queueId === queue.id)
			.map(member => member.userId);
		await Promise.all(
			memberIds.map(async (memberId) => {
				await MemberUtils.modifyRole(store, memberId, queue.roleId, "add");
			}),
		);
	}

	export async function removeQueueRole(store: Store, queue: DbQueue) {
		const memberIds = store.dbMembers()
			.filter(member => member.queueId === queue.id)
			.map(member => member.userId);
		await Promise.all(
			memberIds.map(async (memberId) => {
				await MemberUtils.modifyRole(store, memberId, queue.roleId, "remove");
			}),
		);
	}

	function describeProperty(queue: DbQueue, setting: string) {
		const value = queue[setting as keyof DbQueue];
		const dbQueueCol = QUEUE_TABLE[setting as keyof DbQueue];
		const defaultValue = dbQueueCol?.default;
		const isDefaultValue = value == defaultValue;

		if (isNil(value) && isNil(defaultValue)) return;

		const settingStr = isDefaultValue ? dbQueueCol.name : bold(dbQueueCol.name);
		const valueStr = formatValue(value, setting as keyof DbQueue);
		const defaultValueStr = isDefaultValue ? "" : strikethrough(inlineCode(defaultValue as string));

		return `- ${settingStr} = ${valueStr} ${defaultValueStr}`;
	}

	function formatValue(value: any, setting: keyof DbQueue): string {
		if (value === null) return "";
		const valueFormatter = formattingFunctions[setting];
		return valueFormatter ? valueFormatter(value) : inlineCode(value);
	}
}
import { bold, channelMention, inlineCode, roleMention, strikethrough } from "discord.js";
import { compact, isNil } from "lodash-es";

import { type DbQueue, QUEUE_TABLE } from "../db/schema.ts";

export namespace QueueUtils {
	const QUEUE_HIDDEN_SETTINGS = ["id", "name", "guildId", "lastPullUserIds"];
	const QUEUE_PRINT_SETTINGS = Object.keys(QUEUE_TABLE).filter(prop => !QUEUE_HIDDEN_SETTINGS.includes(prop));

	type FormattingFunctions = Partial<Record<keyof DbQueue, (value: any) => string>>;
	const formattingFunctions: FormattingFunctions = {
		logChannelId: channelMention,
		roleId: roleMention,
		sourceVoiceChannelId: channelMention,
		destinationVoiceChannelId: channelMention,
	};

	export function getQueueProperties(queue: DbQueue) {
		return compact(QUEUE_PRINT_SETTINGS.map(prop => formatSettingWithFallBack(queue, prop))).join("\n");
	}

	export function validateQueueProperties(queue: DbQueue) {
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

	function formatSettingWithFallBack(queue: DbQueue, setting: string) {
		const value = queue[setting as keyof DbQueue];
		const dbQueueCol = QUEUE_TABLE[setting as keyof DbQueue];
		const defaultValue = dbQueueCol?.default;
		const isDefaultValue = value == defaultValue;

		if (isNil(value) && isNil(defaultValue)) {
			return null;
		}

		const settingStr = isDefaultValue ? dbQueueCol.name : bold(dbQueueCol.name);
		const valueStr = formatValue(value, setting as keyof DbQueue);
		const defaultValueStr = isDefaultValue ? "" : strikethrough(inlineCode(defaultValue as string));
		const connectorStr = (valueStr.length || defaultValueStr.length) ? " = " : "";

		return `- ${settingStr} ${connectorStr} ${valueStr} ${defaultValueStr}`;
	}

	function formatValue(value: any, setting: keyof DbQueue): string {
		if (value === null) return "";
		const valueFormatter = formattingFunctions[setting];
		return valueFormatter ? valueFormatter(value) : inlineCode(value);
	}
}
import { bold, channelMention, Collection, inlineCode, type Role, roleMention, strikethrough } from "discord.js";
import { compact, get, isNil, omit } from "lodash-es";

import { db } from "../db/db.ts";
import { type DbQueue, type DbVoice, type NewQueue, QUEUE_TABLE } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { MemberUtils } from "./member.utils.ts";
import { map } from "./misc.utils.ts";
import { timeMention } from "./string.utils.ts";

export namespace QueueUtils {
	const INDESCRIBABLE_QUEUE_PROPERTIES = ["id", "name", "guildId", "queueId"];
	const LABEL_REPLACEMENTS = new Collection([
		["roleInQueueId", "role_in_queue"],
		["roleOnPullId", "role_on_pull"],
	]);

	type FormattingFunctions = Partial<Record<keyof DbQueue | keyof DbVoice, (value: any) => string>>;
	const formattingFunctions: FormattingFunctions = {
		destinationChannelId: channelMention,
		roleInQueueId: roleMention,
		roleOnPullId: roleMention,
		sourceChannelId: channelMention,
		rejoinCooldownPeriod: timeMention,
		rejoinGracePeriod: timeMention,
	};

	export async function insertQueue(store: Store, queue: NewQueue) {
		QueueUtils.validateQueueProperties(queue);

		const insertedQueue = store.insertQueue(queue);

		const role = get(queue, "role") as Role;
		if (role) {
			await MemberUtils.updateInQueueRole(store, [insertedQueue], role.id, "add");
		}

		return { insertedQueue };
	}

	export async function updateQueues(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, update: Partial<DbQueue>) {
		return await db.transaction(async () => {
			QueueUtils.validateQueueProperties(update);

			const updatedQueues = map(queues, queue => store.updateQueue({ id: queue.id, ...update }));
			const updatedQueueIds = updatedQueues.map(queue => queue.id);

			DisplayUtils.requestDisplaysUpdate(store, updatedQueueIds);

			if (update.roleInQueueId) {
				await MemberUtils.updateInQueueRole(store, updatedQueues, update.roleInQueueId, "add");
			}

			return { updatedQueues };
		});
	}

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
		if (queue.pullBatchSize && queue.pullBatchSize < 1) {
			throw new Error("Pull batch size must be a positive number.");
		}
		if (queue.rejoinCooldownPeriod && queue.rejoinCooldownPeriod < 0) {
			throw new Error("Rejoin cooldown period be a positive number.");
		}
		if (queue.rejoinGracePeriod && queue.rejoinGracePeriod < 0) {
			throw new Error("Rejoin grace period must be a positive number.");
		}
		if (queue.size && queue.size < 1) {
			throw new Error("Size must be a positive number.");
		}
	}

	function describeProperty(queue: DbQueue, setting: string) {
		const value = queue[setting as keyof DbQueue];
		const dbQueueCol = QUEUE_TABLE[setting as keyof DbQueue];
		const defaultValue = dbQueueCol?.default;
		const isDefaultValue = value == defaultValue;

		if (isNil(value) && isNil(defaultValue)) return;

		let settingStr = LABEL_REPLACEMENTS.get(setting) ?? setting;
		if (!isDefaultValue) settingStr = bold(settingStr);
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
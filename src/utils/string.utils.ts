import { chatInputApplicationCommandMention } from "@discordjs/formatters";
import cronstrue from "cronstrue";
import {
	bold,
	Collection,
	EmbedBuilder,
	roleMention,
	type Snowflake,
	time,
	type TimestampStylesString,
	userMention,
} from "discord.js";
import { concat, get, groupBy, partition } from "lodash-es";

import { type DbMember, type DbQueue, type DbSchedule } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import { Color, MemberDisplayType, TimestampType } from "../types/db.types.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import { ClientUtils } from "./client.utils.ts";
import { map } from "./misc.utils.ts";

export const ERROR_HEADER_LINE = "⚠️    ERROR    ⚠️";

export function queueMention(queue: DbQueue): string {
	const badges = [];
	if (queue.lockToggle) badges.push("🔒");
	if (queue.notificationsToggle) badges.push("🔔");
	if (queue.autopullToggle) badges.push("🔁");
	return bold(queue.name) + (badges.length ? " " + badges.join(" ") : "");
}

export function queuesMention(queues: ArrayOrCollection<bigint, DbQueue>): string {
	return map(queues, queue => queueMention(queue)).sort().join(", ");
}

export async function membersMention(store: Store, members: ArrayOrCollection<bigint, DbMember>) {
	return (await Promise.all(
		map(members, member => memberMention(store, member))
	)).join("\n");
}

export async function memberMention(store: Store, member: DbMember) {
	const { timestampType, memberDisplayType } = store.dbQueues().get(member.queueId);
	const timeStr = formatTimestamp(member.joinTime, timestampType);
	const prioStr = member.priority ? "✨" : "";
	const msgStr = member.message ? ` -- ${member.message}` : "";

	const jsMember = await store.jsMember(member.userId);
	const discriminator = jsMember?.user?.discriminator ? ("#" + jsMember?.user?.discriminator) : "";
	const username = jsMember.user?.username;
	const isPlaintextMention = memberDisplayType === MemberDisplayType.Plaintext && username;
	const nameStr = isPlaintextMention ? `${username}${discriminator}` : jsMember;

	return `${timeStr}${prioStr}${nameStr}${msgStr}`;
}

export function mentionableMention(mentionable: { isRole: boolean, subjectId: Snowflake }): string {
	return mentionable.isRole ? roleMention(mentionable.subjectId) : userMention(mentionable.subjectId);
}

export function commandMention(commandName: string, subcommandName?: string) {
	const liveCommand = ClientUtils.getLiveCommand(commandName);
	if (subcommandName) {
		return chatInputApplicationCommandMention(commandName, subcommandName, liveCommand.id);
	}
	else {
		return chatInputApplicationCommandMention(commandName, liveCommand.id);
	}
}

export function scheduleMention(schedule: DbSchedule) {
	let humanReadableSchedule = cronstrue.toString(schedule.cron);
	humanReadableSchedule = humanReadableSchedule.charAt(0).toLowerCase() + humanReadableSchedule.slice(1);
	return `will ${schedule.command} ${humanReadableSchedule} (${schedule.timezone})${schedule.reason ? ` - ${schedule.reason}` : ""}`;
}

export function convertSecondsToMinutesAndSeconds(secondsIn: number) {
	if (!secondsIn) return "";

	const minutes = Math.floor(secondsIn / 60);
	const seconds = secondsIn % 60;
	return (minutes > 0 ? minutes + " minute" : "") +
		(minutes > 1 ? "s" : "") +
		(minutes > 0 && seconds > 0 ? " and " : "") +
		(seconds > 0 ? seconds + " second" : "") +
		(seconds > 1 ? "s" : "");
}

export function describeTable<T>(options: {
	store: Store,
	tableName: string,
	color: Color,
	entries: T[],
	mentionFn?: (entry: T) => string,
}) {
	const { store, tableName, color, entries, mentionFn } = options;
	const embeds: EmbedBuilder[] = [];
	for (const [queueId, itemsOfQueue] of Object.entries(groupBy(entries, "queueId"))) {
		let queue;
		try {
			queue = store.dbQueues().get(BigInt(queueId));
		}
		catch {
			queue = null;
		}

		let itemStrings: string[] = [];
		if (get(itemsOfQueue[0], "isRole") !== undefined) {
			const [roles, members] = partition(itemsOfQueue as any, entry => entry.isRole);
			itemStrings = concat(
				roles.map(entry => `- ${roleMention(entry.subjectId)}${entry.reason ? ` - ${entry.reason}` : ""}`).sort(),
				members.map(entry => `- ${userMention(entry.subjectId)}${entry.reason ? ` - ${entry.reason}` : ""}`).sort(),
			);
		}
		else if (mentionFn) {
			itemStrings = itemsOfQueue.map(mentionFn).sort();
		}

		const embed = new EmbedBuilder()
			.setTitle(`${tableName} of ${queue ? `the '${queueMention(queue)}' queue` : "all queues"}`)
			.setColor(color)
			.setDescription(itemStrings.length ? itemStrings.join("\n") : `No ${tableName.toLowerCase()}.`);
		embeds.push(embed);
	}

	if (!embeds.length) {
		const embed = new EmbedBuilder()
			.setTitle(tableName)
			.setColor(color)
			.setDescription(`No ${tableName.toLowerCase()}.`);
		embeds.push(embed);
	}

	return embeds;
}

const timestampToStyle = new Collection<string, TimestampStylesString>([
	[TimestampType.Date, "d"],
	[TimestampType.Time, "T"],
	[TimestampType.DateAndTime, "f"],
	[TimestampType.Relative, "R"],
]);

function formatTimestamp(joinTime: bigint, timestampType: TimestampType) {
	return (timestampType !== TimestampType.Off)
		? time(new Date(Number(joinTime)), timestampToStyle.get(timestampType))
		: "";
}

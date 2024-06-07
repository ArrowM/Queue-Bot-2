import { chatInputApplicationCommandMention } from "@discordjs/formatters";
import cronstrue from "cronstrue";
import { bold, EmbedBuilder, type GuildMember, roleMention, type Snowflake, userMention } from "discord.js";
import { concat, get, groupBy, partition } from "lodash-es";

import { type DbQueue, type DbSchedule } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import { Color, MemberDisplayType } from "../types/db.types.ts";
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

export function queueMemberMention(jsMember: GuildMember, memberDisplayType: MemberDisplayType) {
	const discriminator = jsMember?.user?.discriminator ? ("#" + jsMember?.user?.discriminator) : "";
	const username = jsMember.user?.username;
	const isPlaintextMention = memberDisplayType === MemberDisplayType.Plaintext && username;
	return isPlaintextMention ? `${username}${discriminator}` : jsMember;
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
		embeds.push(new EmbedBuilder().setDescription(`No ${tableName.toLowerCase()}.`));
	}

	return embeds;
}

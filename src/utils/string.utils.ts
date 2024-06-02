import { chatInputApplicationCommandMention } from "@discordjs/formatters";
import cronstrue from "cronstrue";
import {
	bold,
	type Collection,
	EmbedBuilder,
	type GuildMember,
	roleMention,
	type Snowflake,
	userMention,
} from "discord.js";
import { concat, groupBy, partition } from "lodash-es";

import type { Store } from "../core/store.ts";
import { type DbQueue, type DbSchedule } from "../db/schema.ts";
import { Color, MemberDisplayType } from "../types/db.types.ts";
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

export function queuesMention(queues: DbQueue[] | Collection<bigint, DbQueue>): string {
	return map(queues, queue => queueMention(queue)).sort().join(", ");
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
	return `will ${schedule.command} ${humanReadableSchedule} (${schedule.timezone})`;
}

export function convertSecondsToMinutesAndSeconds(secondsIn: number) {
	if (!secondsIn) {
		return "";
	}

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
	mentionFn: (entry: T) => string,
	entries: T[],
}) {
	const { store, tableName, color, mentionFn, entries } = options;
	const embeds: EmbedBuilder[] = [];
	for (const [queueId, queueEntries] of Object.entries(groupBy(entries, "queueId"))) {
		let queue;
		try {
			queue = store.dbQueues().get(BigInt(queueId));
		}
		catch { }

		const embed = new EmbedBuilder()
			.setTitle(`${tableName} of ${queue ? `'${queueMention(queue)}'` : "all queues"}`)
			.setColor(color)
			.setDescription(queueEntries.length
				? queueEntries.map(mentionFn).sort().join("\n")
				: `No ${tableName.toLowerCase()}.`
			);

		embeds.push(embed);
	}

	return embeds;
}

export function describeUserOrRoleTable<T extends { isRole: boolean, subjectId: Snowflake }>(options: {
	store: Store,
	tableName: string,
	color: Color,
	mentionables: T[],
}) {
	const { store, tableName, color, mentionables } = options;
	const embeds: EmbedBuilder[] = [];
	for (const [queueId, queueMentionables] of Object.entries(groupBy(mentionables, "queueId"))) {
		const [roles, members] = partition(queueMentionables, entry => entry.isRole);
		let queue;
		try {
			queue = store.dbQueues().get(BigInt(queueId));
		}
		catch { }

		const embed = new EmbedBuilder()
			.setTitle(`${tableName} of ${queue ? `'${queueMention(queue)}'` : "all queues"}`)
			.setColor(color)
			.setDescription(
				concat(
					roles.map(entry => `- ${roleMention(entry.subjectId)}`).sort(),
					members.map(entry => `- ${userMention(entry.subjectId)}}`).sort()
				).join("\n")
			);

		embeds.push(embed);
	}

	if (!embeds.length) {
		embeds.push(new EmbedBuilder().setDescription(`No ${tableName.toLowerCase()} users or roles.`));
	}

	return embeds;
}
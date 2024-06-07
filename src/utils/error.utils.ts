import { EmbedBuilder } from "discord.js";

import { commandMention } from "./string.utils.ts";

export class CustomError extends Error {
	constructor(
		public message = "Unknown Error",
		public extraEmbeds?: EmbedBuilder[],
		public log = false,
	) {
		super(message);
	}
}

export class QueueLockedError extends CustomError {
	message = "Failed to join queue because it is locked";
}

export class QueueFullError extends CustomError {
	message = "Failed to join queue because it is full.";
}

export class QueueNotFoundError extends CustomError {
	message = "Queue not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Queues can be created with ${commandMention("queues", "add")}.`),
	];
}

export class VoiceNotFoundError extends CustomError {
	message = "Voice not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Voices can be created with ${commandMention("voice", "add")}.`),
	];
}

export class DisplayNotFoundError extends CustomError {
	message = "Display not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Displays can be created with ${commandMention("show")} or ${commandMention("displays", "add")}.`),
	];
}

export class MemberNotFoundError extends CustomError {
	message = "Member not found.";
}

export class ScheduleNotFoundError extends CustomError {
	message = "Schedule not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Schedules can be created with ${commandMention("schedules", "add")}.`),
	];
}

export class PrioritizedNotFoundError extends CustomError {
	message = "Prioritized not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Users and roles can be prioritized with ${commandMention("prioritize", "add")}.`),
	];
}

export class WhitelistedNotFoundError extends CustomError {
	message = "Whitelisted not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Users and roles can be whitelisted with ${commandMention("whitelist", "add")}.`),
	];
}

export class BlacklistedNotFoundError extends CustomError {
	message = "Blacklisted not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Users and roles can be blacklisted with ${commandMention("blacklist", "add")}.`),
	];
}

export class AdminNotFoundError extends CustomError {
	message = "Admin not found.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Admins can be added with ${commandMention("admins", "add")}.`),
	];
}

export class NotOnQueueWhitelistError extends CustomError {
	message = "Failed to join queue because you are not on the queue whitelist.";
}

export class OnQueueBlacklistError extends CustomError {
	message = "Failed to join queue you are on the queue blacklist.";
}

export class QueueAlreadyExistsError extends CustomError {
	message = "Queue already exists.";
}

export class ScheduleAlreadyExistsError extends CustomError {
	message = "Schedule already exists.";
}

export class WhitelistedAlreadyExistsError extends CustomError {
	message = "Whitelisted already exists.";
}

export class BlacklistedAlreadyExistsError extends CustomError {
	message = "Blacklisted already exists.";
}

export class PrioritizedAlreadyExistsError extends CustomError {
	message = "Prioritized already exists.";
}

export class AdminAlreadyExistsError extends CustomError {
	message = "Admin already exists.";
}

export class AdminAccessError extends CustomError {
	message = "Missing Queue Bot admin access.";
	extraEmbeds = [
		new EmbedBuilder().setDescription(`Other admins may grant admin access ${commandMention("admins", "add")}.`),
	];
}

export class InvalidCronError extends CustomError {
	message = "Invalid cron schedule.";
	extraEmbeds = [
		new EmbedBuilder().setDescription("Please see https://crontab.guru/examples.html. Highest frequency is once a minute."),
	];
}

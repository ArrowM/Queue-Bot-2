import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { EveryoneCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { commandMention } from "../../utils/string.utils.ts";

export class HelpCommand extends EveryoneCommand {
	static readonly ID = "help";

	help_setup = HelpCommand.help_setup;
	help_general = HelpCommand.help_general;
	help_admin = HelpCommand.help_admin;

	data = new SlashCommandBuilder()
		.setName(HelpCommand.ID)
		.setDescription("Get helpful info")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("setup")
				.setDescription("Get help with setup"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("general")
				.setDescription("Get help with general tasks like joining and leaving queues"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("admin")
				.setDescription("Get help with admin tasks like managing queues"),
		);

	// ====================================================================
	//                           /help setup
	// ====================================================================

	static async help_setup(inter: SlashInteraction) {
		await inter.respond({
			embeds: [
				new EmbedBuilder()
					.setTitle("Setup Help")
					.setColor(Color.Indigo)
					.setDescription("Hello there! I'm Queue Bot, and I'm here to help you manage your queues. Here's how to get started:")
					.addFields({
						name: "1. Create queues",
						value: "Create queues by typing `/queues add`. You can create as many queues as you want.",
					},
					{
						name: "2. Add Members",
						value: `Members can join by clicking the 'Join' button beneath queue displays, ${commandMention("join")}, or by entering an integrated voice channel. ` +
								`Admins may also enqueue users with ${commandMention("members", "add")}.`,
					},
					{
						name: "3. Pull Members",
						value: `Members can be pulled from queues by admins by clicking the 'Pull' button queue displays or with ${commandMention("pull")}.`,
					},
					{
						name: "4. Explore other commands",
						value: `${commandMention("help", "general")} explains how to join and leave queues. ${commandMention("help", "admin")} explains how admins can manage queues.`,
					}),
			],
		});
	}

	// ====================================================================
	//                           /help general
	// ====================================================================

	static async help_general(inter: SlashInteraction) {
		await inter.respond({
			embeds: [
				new EmbedBuilder()
					.setTitle("General Help")
					.setColor(Color.Indigo)
					.setDescription("The basic queues commands available to everyone:")
					.addFields({
						name: commandMention("help"),
						value: "Get helpful info",
					},
					{
						name: commandMention("join"),
						value: "Join queues",
					},
					{
						name: commandMention("leave"),
						value: "Leave queues",
					},
					{
						name: commandMention("positions"),
						value: "Get your positions in all queues",
					},
					{
						name: commandMention("show"),
						value: "Show queue(s)",
					}),
			],
		});
	}

	// ====================================================================
	//                           /help admin
	// ====================================================================

	static async help_admin(inter: SlashInteraction) {
		await inter.respond({
			embeds: [
				new EmbedBuilder()
					.setTitle("Admin Help")
					.setColor(Color.Indigo)
					.setDescription("The queue commands available to admins:")
					.addFields({
						name: commandMention("admins", "add"),
						value: "Manage admin users and roles",
					},
					{
						name: commandMention("blacklist", "add"),
						value: "Blacklist a user or role from queues",
					},
					{
						name: commandMention("displays", "add"),
						value: "Manage display channels",
					},
					{
						name: commandMention("clear"),
						value: "Clear queues",
					},
					{
						name: commandMention("members", "add"),
						value: "Manage queue members",
					},
					{
						name: commandMention("move"),
						value: "Move a member in queues",
					},
					{
						name: commandMention("prioritize", "add"),
						value: "Manage prioritized users and roles",
					},
					{
						name: commandMention("pull"),
						value: "Pull members from queue(s)",
					},
					{
						name: commandMention("queues", "add"),
						value: "Manage queues",
					},
					{
						name: commandMention("shuffle"),
						value: "Shuffle queues",
					},
					{
						name: commandMention("voice", "add"),
						value: "Manage voice channel settings",
					},
					{
						name: commandMention("whitelist", "add"),
						value: "Whitelist a user or role in queues",
					}),
			],
		});
	}
}

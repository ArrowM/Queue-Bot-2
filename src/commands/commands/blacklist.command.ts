import { type Collection, SlashCommandBuilder } from "discord.js";

import type { DbQueue } from "../../db/schema.ts";
import { BlacklistedsOption } from "../../options/options/blacklisteds.option.ts";
import { MentionableOption } from "../../options/options/mentionable.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { ReasonOption } from "../../options/options/reason.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { BlacklistUtils } from "../../utils/blacklist.utils.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { describeUserOrRoleTable } from "../../utils/string.utils.ts";

export class BlacklistCommand extends AdminCommand {
	static readonly ID = "blacklist";

	blacklist_get = BlacklistCommand.blacklist_get;
	blacklist_add = BlacklistCommand.blacklist_add;
	blacklist_delete = BlacklistCommand.blacklist_delete;

	data = new SlashCommandBuilder()
		.setName(BlacklistCommand.ID)
		.setDescription("Manage blacklisted users and roles")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get blacklisted users and roles");
			Object.values(BlacklistCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Add blacklisted users and roles");
			Object.values(BlacklistCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Delete blacklisted users and roles");
			Object.values(BlacklistCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /blacklist get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get blacklisted entries of specific queue(s)" }),
	};

	static async blacklist_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await BlacklistCommand.GET_OPTIONS.queues.get(inter);

		let blacklisted = [...inter.store.dbBlacklisted().values()];
		if (queues) {
			blacklisted = blacklisted.filter(blacklisted => queues.has(blacklisted.queueId));
		}

		const embeds = describeUserOrRoleTable({
			store: inter.store,
			tableName: "Blacklisted",
			color: Color.Black,
			mentionables: blacklisted,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /blacklist add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to blacklist from" }),
		mentionable: new MentionableOption({ required: true, description: "User or role to blacklist" }),
		reason: new ReasonOption({ description: "Reason for blacklisting" }),
	};

	static async blacklist_add(inter: SlashInteraction) {
		const queues = await BlacklistCommand.ADD_OPTIONS.queues.get(inter);
		const mentionable = BlacklistCommand.ADD_OPTIONS.mentionable.get(inter);
		const reason = BlacklistCommand.ADD_OPTIONS.reason.get(inter);

		const { updatedQueues } = BlacklistUtils.insertBlacklisted(inter.store, queues, mentionable, reason);

		await this.blacklist_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /blacklist delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		blacklisteds: new BlacklistedsOption({ required: true, description: "Blacklisted users and roles" }),
	};

	static async blacklist_delete(inter: SlashInteraction) {
		const blacklisteds = await BlacklistCommand.DELETE_OPTIONS.blacklisteds.get(inter);

		const deletedBlacklisted = BlacklistUtils.deleteBlacklisted(inter.store, blacklisteds.map(blacklisted => blacklisted.id));

		const updatedQueues = deletedBlacklisted.map(deleted => inter.store.dbQueues().get(deleted.queueId));
		await this.blacklist_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}
}

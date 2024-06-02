import { type Collection, SlashCommandBuilder } from "discord.js";

import type { DbQueue } from "../../db/schema.ts";
import { MentionableOption } from "../../options/options/mentionable.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { ReasonOption } from "../../options/options/reason.option.ts";
import { WhitelistedsOption } from "../../options/options/whitelisteds.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { describeUserOrRoleTable } from "../../utils/string.utils.ts";
import { WhitelistUtils } from "../../utils/whitelist.utils.ts";

export class WhitelistCommand extends AdminCommand {
	static readonly ID = "whitelist";

	whitelist_get = WhitelistCommand.whitelist_get;
	whitelist_add = WhitelistCommand.whitelist_add;
	whitelist_delete = WhitelistCommand.whitelist_delete;

	data = new SlashCommandBuilder()
		.setName(WhitelistCommand.ID)
		.setDescription("Manage whitelisted users and roles")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get whitelisted users and roles");
			Object.values(WhitelistCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Add whitelisted users and roles");
			Object.values(WhitelistCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Delete whitelisted users and roles");
			Object.values(WhitelistCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /whitelist get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get whitelist entries of specific queue(s)" }),
	};

	static async whitelist_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await WhitelistCommand.GET_OPTIONS.queues.get(inter);

		let whitelisted = [...inter.store.dbWhitelisted().values()];
		if (queues) {
			whitelisted = whitelisted.filter(whitelisted => queues.has(whitelisted.queueId));
		}

		const embeds = describeUserOrRoleTable({
			store: inter.store,
			tableName: "Whitelisted",
			color: Color.White,
			mentionables: whitelisted,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /whitelist add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to whitelist in" }),
		mentionable: new MentionableOption({ required: true, description: "User or role to whitelist" }),
		reason: new ReasonOption({ description: "Reason for whitelisting" }),
	};

	static async whitelist_add(inter: SlashInteraction) {
		const mentionable = WhitelistCommand.ADD_OPTIONS.mentionable.get(inter);
		const reason = WhitelistCommand.ADD_OPTIONS.reason.get(inter);
		const queues = await WhitelistCommand.ADD_OPTIONS.queues.get(inter);

		const insertedWhitedListed = WhitelistUtils.insertWhitelisted(inter.store, queues, mentionable, reason);

		const updatedQueues = insertedWhitedListed.map(inserted => inter.store.dbQueues().get(inserted.queueId));
		await this.whitelist_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /whitelist delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		whitelisteds: new WhitelistedsOption({ required: true, description: "Whitelisted users and roles to delete" }),
	};

	static async whitelist_delete(inter: SlashInteraction) {
		const whitelisteds = await WhitelistCommand.DELETE_OPTIONS.whitelisteds.get(inter);

		const deletedWhitelisted = WhitelistUtils.deleteWhitelisted(inter.store, whitelisteds.map(whitelisted => whitelisted.id));

		const updatedQueues = deletedWhitelisted.map(deleted => inter.store.dbQueues().get(deleted.queueId));
		await this.whitelist_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}
}

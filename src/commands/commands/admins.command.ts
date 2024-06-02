import { SlashCommandBuilder } from "discord.js";

import { AdminsOption } from "../../options/options/admins.option.ts";
import { MentionableOption } from "../../options/options/mentionable.option.ts";
import { EveryoneCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { AdminUtils } from "../../utils/admin.utils.ts";
import { QueryUtils } from "../../utils/query.utils.ts";
import { describeUserOrRoleTable } from "../../utils/string.utils.ts";

export class AdminsCommand extends EveryoneCommand {
	static readonly ID = "admins";

	admins_get = AdminsCommand.admins_get;
	admins_add = AdminsCommand.admins_add;
	admins_delete = AdminsCommand.admins_delete;

	data = new SlashCommandBuilder()
		.setName(AdminsCommand.ID)
		.setDescription("Manage admin users and roles")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get admin users and roles");
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Add admin users and roles");
			Object.values(AdminsCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Delete admin users and roles");
			Object.values(AdminsCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /admins get
	// ====================================================================

	static async admins_get(inter: SlashInteraction) {
		const admins = QueryUtils.selectManyAdmins({ guildId: inter.guildId });

		const embeds = describeUserOrRoleTable({
			store: inter.store,
			tableName: "Admins",
			color: Color.DarkRed,
			mentionables: admins,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /admins add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		mentionable: new MentionableOption({ required: true, description: "User or role to grant admin access" }),
	};

	static async admins_add(inter: SlashInteraction) {
		const mentionable = AdminsCommand.ADD_OPTIONS.mentionable.get(inter);

		AdminUtils.insertAdmin(inter.store, mentionable);

		await inter.respond(`Granted Queue Bot admin access to ${mentionable}.`);

		await this.admins_get(inter);
	}

	// ====================================================================
	//                           /admins delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		admins: new AdminsOption({ required: true, description: "User or role to revoke admin access" }),
	};

	static async admins_delete(inter: SlashInteraction) {
		const admins = await AdminsCommand.DELETE_OPTIONS.admins.get(inter);

		AdminUtils.deleteAdmins(inter.store, admins.map(admin => admin.id));

		await this.admins_get(inter);
	}
}

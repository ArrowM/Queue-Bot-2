import { type Collection, SlashCommandBuilder } from "discord.js";

import type { DbQueue } from "../../db/schema.ts";
import { MentionableOption } from "../../options/options/mentionable.option.ts";
import { PrioritizedsOption } from "../../options/options/prioritizeds.option.ts";
import { QueuesOption } from "../../options/options/queues.option.ts";
import { ReasonOption } from "../../options/options/reason.option.ts";
import { AdminCommand } from "../../types/command.types.ts";
import { Color } from "../../types/db.types.ts";
import type { SlashInteraction } from "../../types/interaction.types.ts";
import { toCollection } from "../../utils/misc.utils.ts";
import { PriorityUtils } from "../../utils/priority.utils.ts";
import { describeUserOrRoleTable } from "../../utils/string.utils.ts";
import { PriorityOrderOption } from "../../options/options/priority-order.option.ts";

export class PrioritizeCommand extends AdminCommand {
	static readonly ID = "prioritize";

	prioritize_get = PrioritizeCommand.prioritize_get;
	prioritize_add = PrioritizeCommand.prioritize_add;
	prioritize_update = PrioritizeCommand.prioritize_update;
	prioritize_delete = PrioritizeCommand.prioritize_delete;

	data = new SlashCommandBuilder()
		.setName(PrioritizeCommand.ID)
		.setDescription("Manage prioritized users and roles")
		.addSubcommand(subcommand => {
			subcommand
				.setName("get")
				.setDescription("Get prioritized users and roles");
			Object.values(PrioritizeCommand.GET_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("add")
				.setDescription("Add prioritized users and roles");
			Object.values(PrioritizeCommand.ADD_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		})
		.addSubcommand(subcommand => {
			subcommand
				.setName("delete")
				.setDescription("Delete prioritized users and roles");
			Object.values(PrioritizeCommand.DELETE_OPTIONS).forEach(option => option.addToCommand(subcommand));
			return subcommand;
		});

	// ====================================================================
	//                           /prioritize get
	// ====================================================================

	static readonly GET_OPTIONS = {
		queues: new QueuesOption({ description: "Get prioritized entries of specific queue(s)" }),
	};

	static async prioritize_get(inter: SlashInteraction, queues?: Collection<bigint, DbQueue>) {
		queues = queues ?? await PrioritizeCommand.GET_OPTIONS.queues.get(inter);

		const prioritized = [...inter.store.dbPrioritized().values()];
		if (queues) {
			prioritized.filter(prioritized => queues.some(queue => queue.id === prioritized.queueId));
		}

		const embeds = describeUserOrRoleTable({
			store: inter.store,
			tableName: "Prioritized",
			color: Color.Gold,
			mentionables: prioritized,
		});

		await inter.respond({ embeds });
	}

	// ====================================================================
	//                           /prioritize add
	// ====================================================================

	static readonly ADD_OPTIONS = {
		queues: new QueuesOption({ required: true, description: "Queue(s) to prioritize in" }),
		mentionable: new MentionableOption({ required: true, description: "User or role to prioritize" }),
		reason: new ReasonOption({ description: "Reason for the priority" }),
		priorityOrder: new PriorityOrderOption({ description: "Lower priority orders go first" }),
	};

	static async prioritize_add(inter: SlashInteraction) {
		const queues = await PrioritizeCommand.ADD_OPTIONS.queues.get(inter);
		const mentionable = PrioritizeCommand.ADD_OPTIONS.mentionable.get(inter);
		const reason = PrioritizeCommand.ADD_OPTIONS.reason.get(inter);

		const { updatedQueues } = PriorityUtils.insertPrioritized(inter.store, queues, mentionable, reason);

		await this.prioritize_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /prioritize update
	// ====================================================================

	static readonly UPDATE_OPTIONS = {
		prioritizeds: new PrioritizedsOption({ required: true, description: "Prioritized users and roles to update" }),
		reason: new ReasonOption({ description: "Reason for the priority" }),
		priorityOrder: new PriorityOrderOption({ description: "Lower priority orders go first" }),
	};

	static async prioritize_update(inter: SlashInteraction) {
		const prioritizeds = await PrioritizeCommand.UPDATE_OPTIONS.prioritizeds.get(inter);
		const update = {
			reason: PrioritizeCommand.UPDATE_OPTIONS.reason.get(inter),
			priorityOrder: PrioritizeCommand.UPDATE_OPTIONS.priorityOrder.get(inter),
		}

		const { updatedQueues } = PriorityUtils.updatePrioritized(inter.store, prioritizeds.map(prioritized => prioritized.id), update);

		await this.prioritize_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}

	// ====================================================================
	//                           /prioritize delete
	// ====================================================================

	static readonly DELETE_OPTIONS = {
		prioritizeds: new PrioritizedsOption({ required: true, description: "Prioritized users and roles to delete" }),
	};

	static async prioritize_delete(inter: SlashInteraction) {
		const prioritizeds = await PrioritizeCommand.DELETE_OPTIONS.prioritizeds.get(inter);

		const { updatedQueues } = PriorityUtils.deletePrioritized(inter.store, prioritizeds.map(prioritized => prioritized.id));

		await this.prioritize_get(inter, toCollection<bigint, DbQueue>("id", updatedQueues));
	}
}

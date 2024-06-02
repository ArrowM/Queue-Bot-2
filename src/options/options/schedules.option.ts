import { Collection } from "discord.js";

import { SelectMenuTransactor } from "../../core/select-menu-transactor.ts";
import type { DbSchedule } from "../../db/schema.ts";
import type { AutocompleteInteraction, SlashInteraction } from "../../types/interaction.types.ts";
import { CHOICE_ALL, CHOICE_SOME } from "../../types/parsing.types.ts";
import { CustomOption } from "../base.options.ts";
import { ScheduleOption } from "./schedule.option.ts";

export class SchedulesOption extends CustomOption {
	static readonly ID = "schedules";
	name = ScheduleOption.ID;
	autocomplete = true;
	extraChoices = [CHOICE_ALL, CHOICE_SOME];

	getAutocompletions = ScheduleOption.getAutocompletions;

	// force return type to be Collection<bigint, DbSchedule>
	get(inter: AutocompleteInteraction | SlashInteraction) {
		return super.get(inter) as Promise<Collection<bigint, DbSchedule>>;
	}

	protected async getUncached(inter: AutocompleteInteraction | SlashInteraction) {
		const inputString = inter.options.getString(SchedulesOption.ID);
		if (!inputString) return;

		const queues = await inter.parser.getScopedQueues();
		const schedules = inter.parser.getScopedSchedules(queues);

		switch (inputString) {
		case CHOICE_ALL.value:
			return schedules;
		case CHOICE_SOME.value:
			return await this.getViaSelectMenu(inter as SlashInteraction, schedules);
		default:
			const schedule = ScheduleOption.findSchedule(schedules, inputString);
			return schedule ? new Collection([[schedule.id, schedule]]) : null;
		}
	}

	protected async getViaSelectMenu(inter: SlashInteraction, scopedSchedules: Collection<bigint, DbSchedule>): Promise<Collection<bigint, DbSchedule>> {
		// build menu
		const label = SchedulesOption.ID;
		const options = scopedSchedules.map(schedule => ({
			name: schedule.toString(),
			value: schedule.id.toString(),
		}));

		// send and receive
		const selectMenuTransactor = new SelectMenuTransactor(inter);
		const result = await selectMenuTransactor.sendAndReceive(label, options);

		// parse result
		const scheduleIds = result.map(id => BigInt(id));
		const selectedSchedules = scopedSchedules.filter(schedule => scheduleIds.includes(schedule.id));

		// write result
		await selectMenuTransactor.updateWithResult(label, selectedSchedules);

		return selectedSchedules;
	}
}

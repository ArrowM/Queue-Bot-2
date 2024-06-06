import { Collection } from "discord.js";

import type { DbPrioritized } from "../../db/schema.ts";
import type { AutocompleteInteraction, SlashInteraction } from "../../types/interaction.types.ts";
import { CHOICE_ALL, CHOICE_SOME } from "../../types/parsing.types.ts";
import { PrioritizedNotFoundError } from "../../utils/error.utils.ts";
import { CustomOption } from "../base.options.ts";
import { PrioritizedOption } from "./prioritized.option.ts";

export class PrioritizedsOption extends CustomOption {
	static readonly ID = "prioritizeds";
	name = PrioritizedsOption.ID;
	autocomplete = true;
	extraChoices = [CHOICE_ALL, CHOICE_SOME];

	getAutocompletions = PrioritizedOption.getAutocompletions;

	// force return type to be DbPrioritized
	get(inter: AutocompleteInteraction | SlashInteraction) {
		return super.get(inter) as Promise<Collection<bigint, DbPrioritized>>;
	}

	protected async getUncached(inter: AutocompleteInteraction | SlashInteraction) {
		const inputString = inter.options.getString(PrioritizedsOption.ID);
		if (!inputString) return;

		const queues = await inter.parser.getScopedQueues();
		const prioritizeds = inter.parser.getScopedPrioritized(queues);

		const prioritized = PrioritizedOption.findPrioritized(prioritizeds, inputString);
		return prioritized ? new Collection([[prioritized.id, prioritized]]) : null;
	}

	static findPrioritized(prioritizeds: Collection<bigint, DbPrioritized>, idString: string): DbPrioritized {
		try {
			const prioritizedEntry = prioritizeds.find(entry => entry.id === BigInt(idString));
			if (prioritizedEntry) {
				return prioritizedEntry;
			}
			else {
				throw new PrioritizedNotFoundError();
			}
		}
		catch {
			throw new PrioritizedNotFoundError();
		}
	}
}
import { LogLevel } from "../../types/db.types.ts";
import type { AutocompleteInteraction, SlashInteraction } from "../../types/interaction.types.ts";
import { toChoices } from "../../utils/misc.utils.ts";
import { StringOption } from "../base.options.ts";

export class LogLevelOption extends StringOption {
	static readonly ID = "log_level";
	name = LogLevelOption.ID;
	defaultValue = LogLevel.Default;
	choices = toChoices(LogLevel);

	// force return type to be QueueLogLevel
	get(inter: AutocompleteInteraction | SlashInteraction) {
		return super.get(inter) as LogLevel;
	}
}

import type {
	APIApplicationCommandOptionChoice,
	ChannelType,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";

import type { AutoCompleteOptions } from "../options/base.options.ts";
import type { AutocompleteInteraction, SlashInteraction } from "./interaction.types.ts";
import { type CHOICE_ALL, CHOICE_SOME } from "./parsing.types.ts";

export interface OptionParams {
	// description of option in Discord UI
	description: string;

	// whether the option should be autocompleted
	autocomplete?: boolean;
	// types of channels that can be selected
	channelTypes?: readonly ChannelType[];
	// choices for the option
	choices?: APIApplicationCommandOptionChoice<number | string>[];
	// extra values to add to the choices
	extraChoices?: (typeof CHOICE_ALL | typeof CHOICE_SOME)[];
	// default value for the option (shown in description)
	defaultValue?: any;
	// whether the option is required
	required?: boolean;
}

export interface Option {
	name: string;
	description: string;
	autocomplete?: boolean;
	channelTypes?: readonly ChannelType[];
	choices?: APIApplicationCommandOptionChoice<number | string>[];
	extraChoices?: (typeof CHOICE_ALL | typeof CHOICE_SOME)[];
	defaultValue?: any;
	required?: boolean;

	addToCommand(command: SlashCommandBuilder | SlashCommandSubcommandBuilder): void;
	get(inter: AutocompleteInteraction | SlashInteraction): unknown;
	getAutocompletions?(options: AutoCompleteOptions): Promise<unknown[]>;
}

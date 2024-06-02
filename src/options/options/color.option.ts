import { get } from "lodash-es";

import { Color } from "../../types/db.types.ts";
import type { AutocompleteInteraction, SlashInteraction } from "../../types/interaction.types.ts";
import { toChoices } from "../../utils/misc.utils.ts";
import { StringOption } from "../base.options.ts";

export class ColorOption extends StringOption {
	static readonly ID = "color";
	name = ColorOption.ID;
	defaultValue = process.env.DEFAULT_COLOR;
	choices = toChoices(Object.keys(Color));

	// force return type to be ColorType
	get(inter: AutocompleteInteraction | SlashInteraction) {
		return get(Color, super.get(inter)) as Color;
	}
}

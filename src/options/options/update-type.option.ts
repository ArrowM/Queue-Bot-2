import { DisplayUpdateType } from "../../types/db.types.ts";
import type { AutocompleteInteraction, SlashInteraction } from "../../types/interaction.types.ts";
import { toChoices } from "../../utils/misc.utils.ts";
import { StringOption } from "../base.options.ts";

export class UpdateTypeOption extends StringOption {
	static readonly ID = "update_type";
	id = UpdateTypeOption.ID;
	defaultValue = DisplayUpdateType.Edit;
	choices = toChoices(DisplayUpdateType);

	// force return type to be DisplayUpdateType
	get(inter: AutocompleteInteraction | SlashInteraction) {
		return super.get(inter) as DisplayUpdateType;
	}
}

import { BooleanOption } from "../base.options.ts";

export class BlacklistToggleOption extends BooleanOption {
	static readonly ID = "blacklist_toggle";
	name = BlacklistToggleOption.ID;
	defaultValue = false;
}
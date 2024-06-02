import { BooleanOption } from "../base.options.ts";

export class WhitelistToggleOption extends BooleanOption {
	static readonly ID = "whitelist_toggle";
	name = WhitelistToggleOption.ID;
	defaultValue = true;
}

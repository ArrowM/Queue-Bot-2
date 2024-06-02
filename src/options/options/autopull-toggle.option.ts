import { BooleanOption } from "../base.options.ts";

export class AutopullToggleOption extends BooleanOption {
	static readonly ID = "autopull_toggle";
	name = AutopullToggleOption.ID;
	defaultValue = false;
}
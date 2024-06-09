import { BooleanOption } from "../base.options.ts";

export class AutopullToggleOption extends BooleanOption {
	static readonly ID = "autopull_toggle";
	id = AutopullToggleOption.ID;
	defaultValue = false;
}
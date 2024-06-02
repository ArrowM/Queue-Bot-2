import { BooleanOption } from "../base.options.ts";

export class ButtonsToggleOption extends BooleanOption {
	static readonly ID = "buttons_toggle";
	name = ButtonsToggleOption.ID;
	defaultValue = true;
}

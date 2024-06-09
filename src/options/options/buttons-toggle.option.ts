import { BooleanOption } from "../base.options.ts";

export class ButtonsToggleOption extends BooleanOption {
	static readonly ID = "buttons_toggle";
	id = ButtonsToggleOption.ID;
	defaultValue = true;
}

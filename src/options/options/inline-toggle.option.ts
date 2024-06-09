import { BooleanOption } from "../base.options.ts";

export class InlineToggleOption extends BooleanOption {
	static readonly ID = "inline_toggle";
	id = InlineToggleOption.ID;
	defaultValue = false;
}
import { BooleanOption } from "../base.options.ts";

export class InlineToggleOption extends BooleanOption {
	static readonly ID = "inline_toggle";
	name = InlineToggleOption.ID;
	defaultValue = false;
}
import { BooleanOption } from "../base.options.ts";

export class LockToggleOption extends BooleanOption {
	static readonly ID = "lock_toggle";
	name = LockToggleOption.ID;
	defaultValue = false;
}
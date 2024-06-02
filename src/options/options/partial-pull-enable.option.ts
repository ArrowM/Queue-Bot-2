import { BooleanOption } from "../base.options.ts";

export class PartialPullToggleOption extends BooleanOption {
	static readonly ID = "partial_pull_toggle";
	name = PartialPullToggleOption.ID;
	defaultValue = true;
}
import { IntegerOption } from "../base.options.ts";

export class PriorityOrderOption extends IntegerOption {
	static readonly ID = "priority-order";
	name = PriorityOrderOption.ID;
	defaultValue = 1;
}
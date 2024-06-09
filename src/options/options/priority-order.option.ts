import { IntegerOption } from "../base.options.ts";

export class PriorityOrderOption extends IntegerOption {
	static readonly ID = "priority_order";
	id = PriorityOrderOption.ID;
	defaultValue = 5;
}
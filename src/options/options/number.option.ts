import { IntegerOption } from "../base.options.ts";

export class NumberOption extends IntegerOption {
	static readonly ID = "number";
	id = NumberOption.ID;
}

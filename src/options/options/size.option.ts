import { IntegerOption } from "../base.options.ts";

export class SizeOption extends IntegerOption {
	static readonly ID = "size";
	id = SizeOption.ID;
	defaultValue = "unlimited";
}

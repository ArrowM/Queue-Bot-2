import { IntegerOption } from "../base.options.ts";

export class SizeOption extends IntegerOption {
	static readonly ID = "size";
	name = SizeOption.ID;
	defaultValue = "unlimited";
}

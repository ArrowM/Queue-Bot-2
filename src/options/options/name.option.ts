import { StringOption } from "../base.options.ts";

export class NameOption extends StringOption {
	static readonly ID = "name";
	name = NameOption.ID;
}

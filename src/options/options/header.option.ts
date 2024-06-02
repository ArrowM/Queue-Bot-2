import { StringOption } from "../base.options.ts";

export class HeaderOption extends StringOption {
	static readonly ID = "header";
	name = HeaderOption.ID;
}

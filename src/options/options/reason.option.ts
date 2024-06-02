import { StringOption } from "../base.options.ts";

export class ReasonOption extends StringOption {
	static readonly ID = "reason";
	name = ReasonOption.ID;
}
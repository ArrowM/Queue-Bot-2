import { StringOption } from "../base.options.ts";

export class MessageOption extends StringOption {
	static readonly ID = "message";
	id = MessageOption.ID;
}

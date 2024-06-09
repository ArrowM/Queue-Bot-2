import { MentionableOption as BaseMentionableOption } from "../base.options.ts";

export class MentionableOption extends BaseMentionableOption {
	static readonly ID = "mentionable";
	id = MentionableOption.ID;
}

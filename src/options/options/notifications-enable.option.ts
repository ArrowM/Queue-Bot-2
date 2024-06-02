import { BooleanOption } from "../base.options.ts";

export class NotificationsToggleOption extends BooleanOption {
	static readonly ID = "notifications_toggle";
	name = NotificationsToggleOption.ID;
	defaultValue = false;
}
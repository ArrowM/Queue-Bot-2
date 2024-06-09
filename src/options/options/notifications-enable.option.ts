import { BooleanOption } from "../base.options.ts";

export class NotificationsToggleOption extends BooleanOption {
	static readonly ID = "notifications_toggle";
	id = NotificationsToggleOption.ID;
	defaultValue = false;
}
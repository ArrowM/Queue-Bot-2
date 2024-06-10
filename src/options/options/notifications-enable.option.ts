import { QUEUE_TABLE } from "../../db/schema.ts";
import { BooleanOption } from "../base.options.ts";

export class NotificationsToggleOption extends BooleanOption {
	static readonly ID = "notifications_toggle";
	id = NotificationsToggleOption.ID;
	defaultValue = QUEUE_TABLE.notificationsToggle.default;
}
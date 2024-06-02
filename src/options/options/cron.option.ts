import { StringOption } from "../base.options.ts";

export class CronOption extends StringOption {
	static readonly ID = "cron_schedule";
	name = CronOption.ID;
}

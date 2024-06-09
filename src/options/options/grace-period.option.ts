import { IntegerOption } from "../base.options.ts";

export class GracePeriodOption extends IntegerOption {
	static readonly ID = "grace_period";
	id = GracePeriodOption.ID;
	defaultValue = 0;
}

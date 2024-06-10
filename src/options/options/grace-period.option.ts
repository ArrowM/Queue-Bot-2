import { QUEUE_TABLE } from "../../db/schema.ts";
import { IntegerOption } from "../base.options.ts";

export class GracePeriodOption extends IntegerOption {
	static readonly ID = "grace_period";
	id = GracePeriodOption.ID;
	defaultValue = QUEUE_TABLE.gracePeriod.default;
}

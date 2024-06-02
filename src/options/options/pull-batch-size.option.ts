import { IntegerOption } from "../base.options.ts";

export class PullBatchSizeOption extends IntegerOption {
	static readonly ID = "pull_batch_size";
	name = PullBatchSizeOption.ID;
	defaultValue = 1;
}

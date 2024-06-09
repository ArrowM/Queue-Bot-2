import { IntegerOption } from "../base.options.ts";

export class PullBatchSizeOption extends IntegerOption {
	static readonly ID = "pull_batch_size";
	id = PullBatchSizeOption.ID;
	defaultValue = 1;
}

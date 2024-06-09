import { TEXT_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class LogChannelOption extends ChannelOption {
	static readonly ID = "log_channel";
	id = LogChannelOption.ID;
	channelTypes = TEXT_CHANNELS;
}

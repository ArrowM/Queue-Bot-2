import { TEXT_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class LogChannelOption extends ChannelOption {
	static readonly ID = "log_channel";
	name = LogChannelOption.ID;
	channelTypes = TEXT_CHANNELS;
}

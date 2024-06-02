import { TEXT_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class NewDisplayChannelOption extends ChannelOption {
	static readonly ID = "new_display_channel";
	name = NewDisplayChannelOption.ID;
	channelTypes = TEXT_CHANNELS;
}

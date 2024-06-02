import { VOICE_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class DestinationVoiceChannelOption extends ChannelOption {
	static readonly ID = "destination_voice_channel";
	name = DestinationVoiceChannelOption.ID;
	channelTypes = VOICE_CHANNELS;
}

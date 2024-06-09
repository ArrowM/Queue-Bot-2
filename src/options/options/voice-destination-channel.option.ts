import { VOICE_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class VoiceDestinationChannelOption extends ChannelOption {
	static readonly ID = "voice_destination_channel";
	id = VoiceDestinationChannelOption.ID;
	channelTypes = VOICE_CHANNELS;
}

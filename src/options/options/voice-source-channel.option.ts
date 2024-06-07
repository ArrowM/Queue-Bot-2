import { VOICE_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class VoiceSourceChannelOption extends ChannelOption {
	static readonly ID = "voice_source_channel";
	name = VoiceSourceChannelOption.ID;
	channelTypes = VOICE_CHANNELS;
}
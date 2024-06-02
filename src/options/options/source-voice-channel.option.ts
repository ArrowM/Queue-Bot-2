import { VOICE_CHANNELS } from "../../types/misc.types.ts";
import { ChannelOption } from "../base.options.ts";

export class SourceVoiceChannelOption extends ChannelOption {
	static readonly ID = "source_voice_channel";
	name = SourceVoiceChannelOption.ID;
	channelTypes = VOICE_CHANNELS;
}
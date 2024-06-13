import { QUEUE_TABLE } from "../../db/schema.ts";
import { BooleanOption } from "../base.options.ts";

export class VoiceOnlyToggleOption extends BooleanOption {
	static readonly ID = "voice_only_toggle";
	id = VoiceOnlyToggleOption.ID;
	defaultValue = QUEUE_TABLE.voiceOnlyToggle.default;
}
import type { ButtonInteraction } from "../types/interaction.types.ts";
import { DisplayNotFoundError } from "./error.utils.ts";
import { QueryUtils } from "./query.utils.ts";

export namespace ButtonUtils {
	export async function getButtonContext(inter: ButtonInteraction) {
		const display = QueryUtils.selectDisplay({ guildId: inter.guild.id, lastMessageId: inter.message.id });
		if (!display) {
			throw new DisplayNotFoundError();
		}
		const queue = QueryUtils.selectQueue({ guildId: inter.guild.id, id: display.queueId });
		return { display, queue };
	}
}

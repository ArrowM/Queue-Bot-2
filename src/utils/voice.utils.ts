import type { Snowflake } from "discord.js";
import { uniq } from "lodash-es";

import { db } from "../db/db.ts";
import type { DbQueue, DbVoice } from "../db/schema.ts";
import type { Store } from "../db/store.ts";
import type { ArrayOrCollection } from "../types/misc.types.ts";
import { DisplayUtils } from "./display.utils.ts";
import { map } from "./misc.utils.ts";

export namespace VoiceUtils {
	export function insertVoices(store: Store, queues: ArrayOrCollection<bigint, DbQueue>, sourceChannelId: Snowflake, destinationChannelId: Snowflake) {
		return db.transaction(() => {
			// insert into db
			const insertedVoices = map(queues, queue => store.insertVoice({
				guildId: store.guild.id,
				queueId: queue.id,
				sourceChannelId,
				destinationChannelId,
			}));
			const updatedQueueIds = uniq(insertedVoices.map(voice => voice.queueId));

			DisplayUtils.requestDisplaysUpdate(store, updatedQueueIds);

			return { insertedVoices, updatedQueueIds };
		});
	}

	export function updateVoices(store: Store, voiceIds: bigint[], update: Partial<DbVoice>) {
		return db.transaction(() => {
			// update in db
			const updatedVoices = voiceIds.map(id => store.updateVoice({ id, ...update }));
			const updatedQueueIds = uniq(updatedVoices.map(voice => voice.queueId));

			DisplayUtils.requestDisplaysUpdate(store, updatedQueueIds);

			return { updatedVoices, updatedQueueIds };
		});
	}

	export function deleteVoices(store: Store, voiceIds: bigint[]) {
		return db.transaction(() => {
			// delete from db
			const deletedVoices = voiceIds.map(id => store.deleteVoice({ id }));
			const updatedQueueIds = uniq(deletedVoices.map(voice => voice.queueId));

			DisplayUtils.requestDisplaysUpdate(store, updatedQueueIds);

			return { deletedVoices, updatedQueueIds };
		});
	}
}
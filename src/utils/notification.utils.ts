import { groupBy } from "lodash-es";

import type { Store } from "../core/store.ts";
import type { DbMember } from "../db/schema.ts";
import type { NotificationOptions } from "../types/notification.types.ts";
import { queueMention } from "./string.utils.ts";

export namespace NotificationUtils {
	export function notify(
		store: Store,
		membersToNotify: DbMember[],
		notificationOptions: NotificationOptions,
	) {
		const { type, channelToLink } = notificationOptions;
		const notificationPromises = [];
		const queues = store.dbQueues();

		for (const [userId, members] of Object.entries(groupBy(membersToNotify, "userId"))) {
			const queuesOfMember = members.map(member => queues.get(member.queueId));
			const queuesStr = queuesOfMember.length
				? `${queuesOfMember.map(queueMention).join(", ")} queue${queuesOfMember.length > 1 ? "s" : ""}`
				: "whole server";
			const link = channelToLink ?? store.guild;
			const message = `You were just ${type} the ${queuesStr}.\n${link}`;

			notificationPromises.push(
				store.jsMember(userId).then(member =>
					member.user.send(message).catch(() => null),
				),
			);
		}

		Promise.all(notificationPromises);
	}
}
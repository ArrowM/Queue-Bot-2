import type { Collection } from "discord.js";
import { schedule as cron, type ScheduledTask, validate } from "node-cron";

import { Store } from "../core/store.ts";
import { type DbQueue, type DbSchedule, type NewSchedule } from "../db/schema.ts";
import { ArchivedMemberReason, ScheduleCommand } from "../types/db.types.ts";
import { TIMEZONES } from "../types/misc.types.ts";
import { NotificationType } from "../types/notification.types.ts";
import { ClientUtils } from "./client.utils.ts";
import { DisplayUtils } from "./display.utils.ts";
import { InvalidCronError } from "./error.utils.ts";
import { MemberUtils } from "./member.utils.ts";
import { map } from "./misc.utils.ts";
import { QueryUtils } from "./query.utils.ts";

export namespace ScheduleUtils {
	const scheduleIdToScheduleTask = new Map<bigint, ScheduledTask>();

	export function validateCron(cron: string) {
		if (!validate(cron) || cron.split(" ").length !== 5) {
			throw new InvalidCronError();
		}
	}

	export function validateTimezone(timezone: string) {
		if (!TIMEZONES.includes(timezone)) {
			throw new Error("Invalid timezone.");
		}
	}

	export function loadSchedules() {
		const dbSchedules = QueryUtils.selectAllSchedules();
		console.time(`Loaded ${dbSchedules.length} schedules`);
		dbSchedules.forEach(sch => registerWithCronLibrary(sch));
		console.timeEnd(`Loaded ${dbSchedules.length} schedules`);
	}

	export function insertSchedules(store: Store, queues: DbQueue[] | Collection<bigint, DbQueue>, schedule: Omit<NewSchedule, "queueId">) {
		// validate
		validateCron(schedule.cron);
		validateTimezone(schedule.timezone);

		// insert into db and start cron task
		const insertedSchedules = map(queues, (queue) => {
			const insertedSchedule = store.insertSchedule({ queueId: queue.id, ...schedule });
			registerWithCronLibrary(insertedSchedule);
			return insertedSchedule;
		});

		// update displays
		const queuesToUpdate = insertedSchedules.map(schedule => schedule.queueId
			? store.dbQueues().get(schedule.queueId)
			: [...store.dbQueues().values()]
		).flat();
		DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id));

		return { insertedSchedules, updatedQueues: queuesToUpdate };
	}

	export function updateSchedules(store: Store, schedules: Collection<bigint, DbSchedule>, update: Partial<DbSchedule>) {
		// validate
		if (update.cron) validateCron(update.cron);
		if (update.timezone) validateTimezone(update.timezone);

		// update db and cron task
		const updatedSchedules = schedules.map((schedule) => {
			const updatedSchedule = store.updateSchedule({ id: schedule.id, ...update });
			const task = scheduleIdToScheduleTask.get(updatedSchedule.id);
			if (task) {
				task.stop();
				registerWithCronLibrary(updatedSchedule);
			}
			return updatedSchedule;
		});

		// update displays
		const queuesToUpdate = updatedSchedules.map(schedule => schedule.queueId
			? store.dbQueues().get(schedule.queueId)
			: [...store.dbQueues().values()]
		).flat();
		DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id));

		return { updatedSchedules, updatedQueues: queuesToUpdate };
	}

	export function deleteSchedules(scheduleIds: bigint[], store?: Store) {
		if (!store) {
			return {
				deletedSchedules: scheduleIds.map(id => QueryUtils.deleteSchedule({ guildId: store.guild.id, id })),
			};
		}

		// delete from db and stop cron task
		const deletedSchedules = scheduleIds.map((id) => {
			const deletedSchedule = store.deleteSchedule({ id });
			const task = scheduleIdToScheduleTask.get(deletedSchedule.id);
			if (task) {
				task.stop();
				scheduleIdToScheduleTask.delete(deletedSchedule.id);
			}
			return deletedSchedule;
		});

		// update displays
		const queuesToUpdate = deletedSchedules.map(schedule => schedule.queueId
			? store.dbQueues().get(schedule.queueId)
			: [...store.dbQueues().values()]
		).flat();
		DisplayUtils.requestDisplaysUpdate(store, queuesToUpdate.map(queue => queue.id));

		return { deletedSchedules, updatedQueues: queuesToUpdate };
	}

	function registerWithCronLibrary(schedule: DbSchedule) {
		scheduleIdToScheduleTask.set(
			schedule.id,
			cron(schedule.cron, async () => {
				try {
					await executeScheduledCommand(schedule.id);
				}
				catch (e) {
					console.error("Failed to execute scheduled command:");
					console.error(`Error: ${(e as Error).message}`);
					console.error(`Stack Trace: ${(e as Error).stack}`);
				}
			}, { timezone: schedule.timezone }),
		);
	}

	async function executeScheduledCommand(scheduleId: bigint) {
		const { store, queue, schedule } = await getScheduleContext(scheduleId);

		switch (schedule.command) {
		case ScheduleCommand.Clear:
			MemberUtils.clearMembers(store, queue);
			break;
		case ScheduleCommand.Pull:
			MemberUtils.deleteMembers({
				store,
				queues: [queue],
				reason: ArchivedMemberReason.Pulled,
				notification: { type: NotificationType.PULLED_FROM_QUEUE },
			});
			break;
		case ScheduleCommand.Show:
			DisplayUtils.requestDisplayUpdate(store, queue.id, true);
			break;
		case ScheduleCommand.Shuffle:
			MemberUtils.shuffleMembers(store, queue);
		}
	}

	async function getScheduleContext(scheduleId: bigint) {
		let store, queue, schedule;

		try {
			schedule = QueryUtils.selectSchedule({ id: scheduleId });
		}
		catch (e) {
			deleteSchedules([schedule.id]);
			throw e;
		}

		try {
			store = new Store(await ClientUtils.getGuild(schedule.guildId));
		}
		catch (e) {
			QueryUtils.deleteGuild({ guildId: schedule.guildId });
			throw e;
		}

		try {
			queue = QueryUtils.selectQueue({ guildId: schedule.guildId, id: schedule.queueId });
		}
		catch (e) {
			store.deleteQueue({ id: queue.id });
			throw e;
		}

		return { store, queue, schedule };
	}
}

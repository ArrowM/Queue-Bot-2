import { Client, GatewayIntentBits } from "discord.js";

import { ClientUtils } from "../utils/client.utils.ts";
import { ScheduleUtils } from "../utils/schedule.utils.ts";
import { ClientListeners } from "./client-listeners.ts";

export const CLIENT = new Client({
	intents: [
		// Required for guild / channel updates
		GatewayIntentBits.Guilds,
		// Required for voice updates
		GatewayIntentBits.GuildVoiceStates,
		// Required for fetching full member lists to check for offline changes
		GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences,
	],
});

export async function start() {
	try {
		console.time("READY");

		ClientListeners.load();

		ClientUtils.checkRequiredEnvironmentVariables();

		await ClientUtils.login();

		await ClientUtils.registerCommands();

		ScheduleUtils.loadSchedules();

		ClientUtils.loadTopGGAutoPoster();

		console.timeEnd("READY");

		ClientUtils.checkForOfflineGuildChanges();

		ClientUtils.checkForPatchNotes();
	}
	catch (e) {
		const { message, stack } = e as Error;
		console.error("Failed to start bot:");
		console.error(`Error: ${message}`);
		console.error(`Stack Trace: ${stack}`);
	}
}

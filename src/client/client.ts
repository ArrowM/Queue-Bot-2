import { Client as DiscordClient, GatewayIntentBits } from "discord.js";

import { ClientUtils } from "../utils/client.utils.ts";
import { ScheduleUtils } from "../utils/schedule.utils.ts";
import { ClientListeners } from "./client-listeners.ts";

export const CLIENT = new DiscordClient({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
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

		await ClientUtils.checkPatchNotes();

	}
	catch (e) {
		const { message, stack } = e as Error;
		console.error("Failed to start bot:");
		console.error(`Error: ${message}`);
		console.error(`Stack Trace: ${stack}`);
	}
}

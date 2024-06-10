import * as fs from "node:fs";

import {
	ActivityType,
	ApplicationCommand,
	type Collection,
	type Guild,
	type GuildResolvable,
	REST,
	Routes,
	type Snowflake,
	TextChannel,
} from "discord.js";
import { chunk } from "lodash-es";
import AutoPoster from "topgg-autoposter";

import { CLIENT } from "../client/client.ts";
import { COMMANDS } from "../commands/commands.loader.ts";
import { QueryUtils } from "../db/queries.ts";
import { Store } from "../db/store.ts";
import { Color, DisplayUpdateType } from "../types/db.types.ts";
import { DisplayUtils } from "./display.utils.ts";

export namespace ClientUtils {
	// indexed by `id`
	let LIVE_COMMANDS: Collection<Snowflake, ApplicationCommand<{ guild: GuildResolvable }>>;

	export async function registerCommands() {
		try {
			console.time(`Registered ${COMMANDS.size} commands with server`);
			const commandsPutRoute = Routes.applicationCommands(process.env.CLIENT_ID);
			const commandsJSON = COMMANDS.map(c => c.data.toJSON());
			await new REST()
				.setToken(process.env.TOKEN)
				.put(commandsPutRoute, { body: commandsJSON });

			LIVE_COMMANDS = await CLIENT.application.commands.fetch();
			console.timeEnd(`Registered ${COMMANDS.size} commands with server`);
		}
		catch (e) {
			console.error(e);
		}
	}

	export function getLiveCommand(commandName: string) {
		return LIVE_COMMANDS.find(cmd => cmd.name === commandName);
	}

	export async function getGuild(guildId: string) {
		return await CLIENT.guilds.fetch(guildId);
	}

	export async function login() {
		console.time("Logged in");
		await CLIENT.login(process.env.TOKEN);
		CLIENT.user.setActivity({ name: "ready to /help", type: ActivityType.Custom });
		console.timeEnd("Logged in");
	}

	export function checkRequiredEnvironmentVariables() {
		[
			"TOKEN",
			"CLIENT_ID",
			"DEFAULT_COLOR",
		].forEach(name => {
			if (process.env[name] == null) {
				throw new Error(`Required environment variable ${name} not set. Please edit .env file.`);
			}
		});
		// color check
		if (!Object.keys(Color).includes(process.env.DEFAULT_COLOR as string)) {
			throw new Error(`Invalid DEFAULT_COLOR value. Please edit .env file\nOptions: [${Object.keys(Color).join(", ")}]`);
		}
	}

	export async function checkForPatchNotes() {
		// Check if any patch notes have not been read
		const dbPatchNotes = QueryUtils.selectAllPatchNotes();
		const unreadFileNames = fs.readdirSync("./patch-notes")
			.filter(fileNames => !dbPatchNotes.some(dbPatchNote => dbPatchNote.fileName == fileNames));
		if (unreadFileNames.length === 0) return;

		// Use dynamic import to load the .ts file
		const patchNotesChannelId = process.env.PATCH_NOTES_CHANNEL_ID;
		if (!patchNotesChannelId) return;
		const patchNoteChannel = CLIENT.channels.cache.get(patchNotesChannelId) as TextChannel;
		for (const fileName of unreadFileNames) {
			const { embeds } = await import(`../../patch-notes/${fileName}`);

			// wait for console confirmation
			console.log(`Patch notes for ${fileName} have not been read.`);
			console.log("Type 'confirm' to send the patch notes:");
			const userInput = (await new Promise(resolve => process.stdin.once("data", resolve))).toString().trim();
			if (userInput.toLowerCase() === "confirm") {
				await patchNoteChannel.send({ embeds });
				QueryUtils.insertPatchNotes({ fileName });
			}
			else {
				console.log("Patch notes not sent. Continuing...");
			}
		}
	}

	export function loadTopGGAutoPoster() {
		if (process.env.TOP_GG_TOKEN) {
			console.time("Linked Top.gg AutoPoster");
			AutoPoster(process.env.TOP_GG_TOKEN, CLIENT).on("error", () => null);
			console.timeEnd("Linked Top.gg AutoPoster");
		}
	}

	export async function refetchMembers(guild: Guild) {
		guild.members.cache.clear();
		await guild.members.fetch();
	}

	export async function checkForOfflineGuildChanges() {
		console.time("Checked for offline changes");
		// Force fetch of all guilds
		const guilds = await CLIENT.guilds.fetch();

		// Split guildIds into chunks of 10
		const guildIdChunks = chunk(guilds.map(guild => guild.id), 10);

		// Update guilds in chunks of 10 with a 3-second pause between each chunk
		for (let i = 0; i < guildIdChunks.length; i++) {
			if (i % 10 === 0) console.log(`Checking for offline changes... [Completed: ${i * 10}/${guilds.size} guilds]`);

			// Create an array of promises for the current chunk
			const promises = guildIdChunks[i].map(async guildId => {
				const guild = await getGuild(guildId);
				const store = new Store(guild);

				// Force fetch of all members per guild
				await refetchMembers(guild);

				// Update all queues
				const queueIds = store.dbQueues().map(queue => queue.id);
				DisplayUtils.requestDisplaysUpdate(store, queueIds, { updateTypeOverride: DisplayUpdateType.Edit });
			});

			if (i < guildIdChunks.length - 1) {
				// Pause for 5 seconds after each chunk
				promises.push(new Promise(resolve => setTimeout(resolve, 3000)));
			}

			// Execute all promises in the chunk concurrently
			await Promise.all(promises);
		}

		console.timeEnd("Checked for offline changes");
	}
}

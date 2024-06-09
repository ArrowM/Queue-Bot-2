import { Events } from "discord.js";

import { ClientHandler } from "../handlers/client.handler.ts";
import { InteractionHandler } from "../handlers/interaction.handler.ts";
import { CLIENT } from "./client.ts";

export namespace ClientListeners {
	export function load() {
		CLIENT.on(Events.GuildCreate, ClientHandler.handleGuildCreate);
		CLIENT.on(Events.GuildDelete, ClientHandler.handleGuildDelete);

		CLIENT.on(Events.InteractionCreate, inter => new InteractionHandler(inter).handle());
	}
}
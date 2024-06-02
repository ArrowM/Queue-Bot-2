import {
	type AutocompleteInteraction as DiscordAutocompleteInteraction,
	type ButtonInteraction as DiscordButtonInteraction,
	type ChatInputCommandInteraction as DiscordSlashCommandInteration,
	type GuildMember,
	type Interaction as DiscordInteraction,
	type InteractionReplyOptions,
	type Message,
	MessagePayload,
} from "discord.js";

import { type Parser } from "../core/parser.ts";
import type { Store } from "../core/store.ts";

interface BaseProperties {
	store: Store;
	respond: (options: (InteractionReplyOptions | string | MessagePayload)) => Promise<Message>;
	member: GuildMember;
}

type AutocompleteProperties = BaseProperties & {
	parser: Parser<AutocompleteInteraction>;
}

type SlashProperties = BaseProperties & {
	parser: Parser<SlashInteraction>;
	promptConfirmOrCancel?: (message: string) => Promise<boolean>;
}

export type AnyInteraction = Omit<DiscordInteraction, "member"> & BaseProperties;
export type AutocompleteInteraction = Omit<DiscordAutocompleteInteraction, "member"> & AutocompleteProperties;
export type ButtonInteraction = Omit<DiscordButtonInteraction, "member"> & SlashProperties;
export type SlashInteraction = Omit<DiscordSlashCommandInteration, "member"> & SlashProperties;
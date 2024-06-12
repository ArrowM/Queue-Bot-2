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

import type { Store } from "../db/store.ts";
import { type Parser } from "../utils/message-utils/parser.ts";

interface BaseProperties {
	store: Store;
	/** InteractionUtils.respond() */
	respond: (options: (InteractionReplyOptions | string | MessagePayload)) => Promise<Message>;
	member: GuildMember; // overrides default type of `GuildMember | APIInteractionGuildMember`
}

type AutocompleteProperties = BaseProperties & {
	parser: Parser<AutocompleteInteraction>;
}

type SlashProperties = BaseProperties & {
	parser: Parser<SlashInteraction>;
	promptConfirmOrCancel?: (message: string) => Promise<boolean>;
}

export type AnyInteraction = DiscordInteraction & BaseProperties;
export type AutocompleteInteraction = DiscordAutocompleteInteraction & AutocompleteProperties;
export type ButtonInteraction = DiscordButtonInteraction & SlashProperties;
export type SlashInteraction = DiscordSlashCommandInteration & SlashProperties;
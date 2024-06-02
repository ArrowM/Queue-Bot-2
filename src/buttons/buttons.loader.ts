import { Collection } from "discord.js";

import type { Button } from "../types/button.types.ts";
import { JoinButton } from "./buttons/join.button.ts";
import { LeaveButton } from "./buttons/leave.button.ts";
import { PullButton } from "./buttons/pull.button.ts";
import { ShuffleButton } from "./buttons/shuffle.button.ts";

export const BUTTONS = new Collection<string, Button>([
	[JoinButton.ID, new JoinButton()],
	[LeaveButton.ID, new LeaveButton()],
	[PullButton.ID, new PullButton()],
	[ShuffleButton.ID, new ShuffleButton()],
]);
import { Collection } from "discord.js";

import type { Button } from "../types/button.types.ts";
import { ClearButton } from "./buttons/clear.button.ts";
import { JoinButton } from "./buttons/join.button.ts";
import { LeaveButton } from "./buttons/leave.button.ts";
import { MyPositionsButton } from "./buttons/my-positions.button.ts";
import { PullButton } from "./buttons/pull.button.ts";
import { ShuffleButton } from "./buttons/shuffle.button.ts";

export const BUTTONS = new Collection<string, Button>([
	[JoinButton.ID, new JoinButton()],
	[LeaveButton.ID, new LeaveButton()],
	[MyPositionsButton.ID, new MyPositionsButton()],
	[PullButton.ID, new PullButton()],
	[ClearButton.ID, new ClearButton()],
	[ShuffleButton.ID, new ShuffleButton()],
]);
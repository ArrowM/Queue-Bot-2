import { IntegerOption } from "../base.options.ts";

export class PositionOption extends IntegerOption {
	static readonly ID = "position";
	name = PositionOption.ID;
}
import { RoleOption as BaseRoleOption } from "../base.options.ts";

export class RoleOption extends BaseRoleOption {
	static readonly ID = "role";
	id = RoleOption.ID;
}

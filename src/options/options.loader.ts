import { Collection } from "discord.js";

import type { Option } from "../types/option.types.ts";
import { AutopullToggleOption } from "./options/autopull-toggle.option.ts";
import { ButtonsToggleOption } from "./options/buttons-toggle.option.ts";
import { ColorOption } from "./options/color.option.ts";
import { CommandOption } from "./options/command.option.ts";
import { CronOption } from "./options/cron.option.ts";
import { DestinationVoiceChannelOption } from "./options/destination-voice-channel.option.ts";
import { DisplaysOption } from "./options/displays.option.ts";
import { GracePeriodOption } from "./options/grace-period.option.ts";
import { HeaderOption } from "./options/header.option.ts";
import { InlineToggleOption } from "./options/inline-toggle.option.ts";
import { LockToggleOption } from "./options/lock-toggle.option.ts";
import { LogChannelOption } from "./options/log-channel.option.ts";
import { LogLevelOption } from "./options/log-level.option.ts";
import { MemberOption } from "./options/member.option.ts";
import { MemberDisplayTypeOption } from "./options/member-display-type.option.ts";
import { MembersOption } from "./options/members.option.ts";
import { MentionableOption } from "./options/mentionable.option.ts";
import { MessageOption } from "./options/message.option.ts";
import { NameOption } from "./options/name.option.ts";
import { NewDisplayChannelOption } from "./options/new-display-channel.option.ts";
import { NotificationsToggleOption } from "./options/notifications-enable.option.ts";
import { NumberOption } from "./options/number.option.ts";
import { PullBatchSizeOption } from "./options/pull-batch-size.option.ts";
import { QueueOption } from "./options/queue.option.ts";
import { QueuesOption } from "./options/queues.option.ts";
import { RoleOption } from "./options/role.option.ts";
import { ScheduleOption } from "./options/schedule.option.ts";
import { SchedulesOption } from "./options/schedules.option.ts";
import { SizeOption } from "./options/size.option.ts";
import { SourceVoiceChannelOption } from "./options/source-voice-channel.option.ts";
import { TimestampTypeOption } from "./options/timestamp-type.option.ts";
import { TimezoneOption } from "./options/timezone.option.ts";
import { UpdateTypeOption } from "./options/update-type.option.ts";

export const OPTIONS = new Collection<string, Option>([
	[AutopullToggleOption.ID, new AutopullToggleOption()],
	[ButtonsToggleOption.ID, new ButtonsToggleOption()],
	[ColorOption.ID, new ColorOption()],
	[CommandOption.ID, new CommandOption()],
	[CronOption.ID, new CronOption()],
	[DestinationVoiceChannelOption.ID, new DestinationVoiceChannelOption()],
	[DisplaysOption.ID, new DisplaysOption()],
	[GracePeriodOption.ID, new GracePeriodOption()],
	[HeaderOption.ID, new HeaderOption()],
	[InlineToggleOption.ID, new InlineToggleOption()],
	[LockToggleOption.ID, new LockToggleOption()],
	[LogChannelOption.ID, new LogChannelOption()],
	[LogLevelOption.ID, new LogLevelOption()],
	[MemberOption.ID, new MemberOption()],
	[MemberDisplayTypeOption.ID, new MemberDisplayTypeOption()],
	[MembersOption.ID, new MembersOption()],
	[MentionableOption.ID, new MentionableOption()],
	[MessageOption.ID, new MessageOption()],
	[NameOption.ID, new NameOption()],
	[NewDisplayChannelOption.ID, new NewDisplayChannelOption()],
	[NotificationsToggleOption.ID, new NotificationsToggleOption()],
	[NumberOption.ID, new NumberOption()],
	[PullBatchSizeOption.ID, new PullBatchSizeOption()],
	[QueueOption.ID, new QueueOption()],
	[QueuesOption.ID, new QueuesOption()],
	[RoleOption.ID, new RoleOption()],
	[ScheduleOption.ID, new ScheduleOption()],
	[SchedulesOption.ID, new SchedulesOption()],
	[SizeOption.ID, new SizeOption()],
	[SourceVoiceChannelOption.ID, new SourceVoiceChannelOption()],
	[TimestampTypeOption.ID, new TimestampTypeOption()],
	[TimezoneOption.ID, new TimezoneOption()],
	[UpdateTypeOption.ID, new UpdateTypeOption()],
]);

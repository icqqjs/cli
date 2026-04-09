import React from "react";
import { Text } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { IpcCommand } from "@/components/IpcCommand.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "生成频道帖子分享URL";

export const args = zod.tuple([
  zod.string().describe(
    argument({ name: "guild-id", description: "频道ID" }),
  ),
  zod.string().describe(
    argument({ name: "channel-id", description: "子频道ID" }),
  ),
  zod.string().describe(
    argument({ name: "forum-id", description: "帖子ID" }),
  ),
]);

type Props = { args: zod.infer<typeof args> };

export default function ForumUrl({ args: [guildId, channelId, forumId] }: Props) {
  return (
    <IpcCommand
      action={Actions.GET_FORUM_URL}
      params={{ guild_id: guildId, channel_id: channelId, forum_id: forumId }}
      render={(data: any) => <Text>{data.url}</Text>}
    />
  );
}

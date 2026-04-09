import React, { useState } from "react";
import { Text } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { IpcCommand } from "@/components/IpcCommand.js";
import { Actions } from "@/daemon/protocol.js";
import { GuildSelector, ChannelSelector } from "@/components/Selectors.js";

export const description = "生成频道帖子分享URL";

export const args = zod.tuple([
  zod.string().optional().describe(
    argument({ name: "guild-id", description: "频道ID（不填则交互选择）" }),
  ),
  zod.string().optional().describe(
    argument({ name: "channel-id", description: "子频道ID（不填则交互选择）" }),
  ),
  zod.string().optional().describe(
    argument({ name: "forum-id", description: "帖子ID" }),
  ),
]);

type Props = { args: zod.infer<typeof args> };

export default function ForumUrl({ args: [guildId, channelId, forumId] }: Props) {
  const [selectedGuild, setSelectedGuild] = useState(guildId);
  const [selectedChannel, setSelectedChannel] = useState(channelId);

  if (!selectedGuild) return <GuildSelector onSelect={setSelectedGuild} />;
  if (!selectedChannel) return <ChannelSelector guildId={selectedGuild} onSelect={setSelectedChannel} />;
  if (!forumId) return null;

  return (
    <IpcCommand
      action={Actions.GET_FORUM_URL}
      params={{ guild_id: selectedGuild, channel_id: selectedChannel, forum_id: forumId }}
      render={(data: any) => <Text>{data.url}</Text>}
    />
  );
}

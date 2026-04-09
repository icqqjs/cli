import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { ChannelChatSession } from "@/components/ChannelChatSession.js";
import { GuildSelector, ChannelSelector } from "@/components/Selectors.js";
import { resolveUin } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";

export const description = "进入子频道聊天模式";

export const args = zod.tuple([
  zod.string().optional().describe(
    argument({ name: "guild_id", description: "频道ID（不填则交互选择）" }),
  ),
  zod.string().optional().describe(
    argument({ name: "channel_id", description: "子频道ID（不填则交互选择）" }),
  ),
]);

type Props = { args: zod.infer<typeof args> };

export default function ChannelChat({ args: [guildId, channelId] }: Props) {
  const { exit } = useApp();
  const [ipc, setIpc] = useState<IpcClient | null>(null);
  const [selectedGuild, setSelectedGuild] = useState(guildId);
  const [selectedChannel, setSelectedChannel] = useState(channelId);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const uin = await resolveUin();
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");
        const client = await IpcClient.connect(uin);
        setIpc(client);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => { ipc?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <Text color="red">✖ {error}</Text>;
  if (!ipc) return <Spinner label="连接守护进程…" />;
  if (!selectedGuild) return <GuildSelector onSelect={setSelectedGuild} />;
  if (!selectedChannel) return <ChannelSelector guildId={selectedGuild} onSelect={setSelectedChannel} />;

  return <ChannelChatSession ipc={ipc} guildId={selectedGuild} channelId={selectedChannel} />;
}

import React from "react";
import { Text } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { IpcCommand } from "@/components/IpcCommand.js";
import { Actions } from "@/daemon/protocol.js";
import { Table } from "@/components/Table.js";

export const description = "查看频道下的子频道列表";

export const args = zod.tuple([
  zod.string().describe(argument({ name: "guild_id", description: "频道ID" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GuildChannels({ args: [guildId] }: Props) {
  return (
    <IpcCommand
      action={Actions.GUILD_CHANNELS}
      params={{ guild_id: guildId }}
      loadingText="获取子频道列表…"
      render={(data: any) => {
        const channels = Array.isArray(data) ? data : [];
        if (channels.length === 0) return <Text dimColor>暂无子频道</Text>;
        return (
          <Table
            columns={[
              { key: "channel_id", header: "子频道ID", width: 20 },
              { key: "channel_name", header: "子频道名称", width: 30 },
              { key: "channel_type", header: "类型", width: 8 },
            ]}
            data={channels}
          />
        );
      }}
    />
  );
}

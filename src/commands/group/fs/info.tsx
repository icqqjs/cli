import React from "react";
import { Text, Box } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { IpcCommand } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "查看群文件系统信息";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GfsInfo({ args: [gid] }: Props) {
  return (
    <IpcCommand
      action={Actions.GFS_STAT}
      params={{ group_id: gid }}
      loadingText="获取文件系统信息…"
      render={(data: any) => (
        <Box flexDirection="column" paddingX={1}>
          <Text bold color="cyan">群文件系统信息</Text>
          <Text>文件数: {data.file_count}</Text>
          <Text>最大文件数: {data.max_file_count}</Text>
          <Text>已用空间: {(data.used_space / 1024 / 1024).toFixed(1)} MB</Text>
          <Text>总空间: {(data.total_space / 1024 / 1024).toFixed(1)} MB</Text>
        </Box>
      )}
    />
  );
}

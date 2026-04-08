import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "重命名群文件/目录";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "fid", description: "文件/目录ID" })),
  zod.string().describe(argument({ name: "name", description: "新名称" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GfsRename({ args: [gid, fid, name] }: Props) {
  return (
    <IpcMutate
      action={Actions.GFS_RENAME}
      params={{ group_id: gid, fid, name }}
      loadingText="重命名…"
      successText={`已重命名为「${name}」`}
    />
  );
}

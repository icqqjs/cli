import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "删除群文件/目录";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "fid", description: "文件/目录ID" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GfsDelete({ args: [gid, fid] }: Props) {
  return (
    <IpcMutate
      action={Actions.GFS_DELETE}
      params={{ group_id: gid, fid }}
      loadingText="删除文件…"
      successText="文件/目录已删除"
    />
  );
}

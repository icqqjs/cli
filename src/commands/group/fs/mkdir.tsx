import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "在群文件系统中创建目录";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "name", description: "目录名" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GfsMkdir({ args: [gid, name] }: Props) {
  return (
    <IpcMutate
      action={Actions.GFS_MKDIR}
      params={{ group_id: gid, name }}
      loadingText="创建目录…"
      successText={`目录「${name}」已创建`}
    />
  );
}

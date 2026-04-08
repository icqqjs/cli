import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "退出群";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupQuit({ args: [gid] }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_QUIT}
      params={{ group_id: gid }}
      loadingText="退出群…"
      successText={`已退出群 ${gid}`}
    />
  );
}

import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "群签到/打卡";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupSign({ args: [gid] }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_SIGN}
      params={{ group_id: gid }}
      loadingText="签到中…"
      successText="群签到成功"
    />
  );
}

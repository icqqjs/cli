import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置群备注";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "remark", description: "备注内容" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function SetGroupRemark({ args: [gid, remark] }: Props) {
  return (
    <IpcMutate
      action={Actions.SET_GROUP_REMARK}
      params={{ group_id: gid, remark }}
      loadingText="设置群备注…"
      successText={`群备注已设置为「${remark}」`}
    />
  );
}

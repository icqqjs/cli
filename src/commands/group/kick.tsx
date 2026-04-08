import React from "react";
import zod from "zod";
import { argument, option } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "踢出群成员";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
]);

export const options = zod.object({
  block: zod.boolean().default(false).describe(option({ description: "不再接收申请", alias: "b" })),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };

export default function GroupKick({ args: [gid, uid], options: { block } }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_KICK}
      params={{ group_id: gid, user_id: uid, block }}
      loadingText="踢出成员…"
      successText={`已将 ${uid} 踢出群`}
    />
  );
}

import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置群名片";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
  zod.string().describe(argument({ name: "card", description: "群名片内容" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function SetGroupCard({ args: [gid, uid, card] }: Props) {
  return (
    <IpcMutate
      action={Actions.SET_GROUP_CARD}
      params={{ group_id: gid, user_id: uid, card }}
      loadingText="设置群名片…"
      successText={`群名片已设置为「${card}」`}
    />
  );
}

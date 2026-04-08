import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "邀请好友入群";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "好友QQ号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupInvite({ args: [gid, uid] }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_INVITE}
      params={{ group_id: gid, user_id: uid }}
      loadingText="邀请入群…"
      successText={`已邀请 ${uid} 加入群 ${gid}`}
    />
  );
}

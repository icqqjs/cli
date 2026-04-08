import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "设置好友备注";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "uid", description: "好友QQ号" })),
  zod.string().describe(argument({ name: "remark", description: "备注名" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function FriendRemark({ args: [uid, remark] }: Props) {
  return (
    <IpcMutate
      action={Actions.FRIEND_SET_REMARK}
      params={{ user_id: uid, remark }}
      loadingText="设置备注…"
      successText={`已将好友 ${uid} 的备注设为「${remark}」`}
    />
  );
}

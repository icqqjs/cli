import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "@/components/IpcCommand.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "发送群消息（同 icqq send group <gid> <message>）";

export const args = zod.tuple([
  zod.number().describe(
    argument({ name: "gid", description: "群号" }),
  ),
  zod.string().describe(
    argument({ name: "message", description: "消息内容" }),
  ),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupSend({ args: [gid, message] }: Props) {
  return (
    <IpcMutate
      action={Actions.SEND_GROUP_MSG}
      params={{ group_id: gid, message }}
      loadingText="发送消息…"
      successText={`消息已发送到群 ${gid}`}
    />
  );
}

import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../components/IpcCommand.js";
import { Actions } from "../daemon/protocol.js";

export const description = "发送单条消息";

export const args = zod.tuple([
  zod.enum(["private", "group"]).describe(
    argument({ name: "type", description: "消息类型 (private|group)" }),
  ),
  zod.number().describe(
    argument({ name: "id", description: "目标ID（QQ号或群号）" }),
  ),
  zod.string().describe(
    argument({ name: "message", description: "消息内容" }),
  ),
]);

type Props = { args: zod.infer<typeof args> };

export default function Send({ args: [type, id, message] }: Props) {
  const action =
    type === "private" ? Actions.SEND_PRIVATE_MSG : Actions.SEND_GROUP_MSG;
  const params =
    type === "private"
      ? { user_id: id, message }
      : { group_id: id, message };

  return (
    <IpcMutate
      action={action}
      params={params}
      loadingText="发送消息…"
      successText={`消息已发送到${type === "private" ? "好友" : "群"} ${id}`}
    />
  );
}

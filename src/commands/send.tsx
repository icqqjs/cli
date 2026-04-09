import React from "react";
import zod from "zod";
import { argument, option } from "pastel";
import { IpcMutate } from "@/components/IpcCommand.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "发送单条消息";

export const args = zod.tuple([
  zod.enum(["private", "group", "temp"]).describe(
    argument({ name: "type", description: "消息类型 (private|group|temp)" }),
  ),
  zod.number().describe(
    argument({ name: "id", description: "目标ID（QQ号或群号）" }),
  ),
  zod.string().describe(
    argument({ name: "message", description: "消息内容" }),
  ),
]);

export const options = zod.object({
  gid: zod.number().optional().describe(option({ description: "群号（temp 类型必填，指定临时消息来源群）", alias: "g" })),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };

export default function Send({ args: [type, id, message], options: { gid } }: Props) {
  const action =
    type === "private" ? Actions.SEND_PRIVATE_MSG :
    type === "temp" ? Actions.SEND_TEMP_MSG :
    Actions.SEND_GROUP_MSG;
  const params =
    type === "private"
      ? { user_id: id, message }
      : type === "temp"
      ? { group_id: gid, user_id: id, message }
      : { group_id: id, message };

  return (
    <IpcMutate
      action={action}
      params={params}
      loadingText="发送消息…"
      successText={`消息已发送到${type === "private" ? "好友" : type === "temp" ? "临时会话" : "群"} ${id}`}
    />
  );
}

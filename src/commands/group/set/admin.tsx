import React from "react";
import zod from "zod";
import { argument, option } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置/取消群管理员";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
]);

export const options = zod.object({
  remove: zod.boolean().default(false).describe(option({ description: "取消管理员", alias: "r" })),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };

export default function SetGroupAdmin({ args: [gid, uid], options: { remove } }: Props) {
  return (
    <IpcMutate
      action={Actions.SET_GROUP_ADMIN}
      params={{ group_id: gid, user_id: uid, enable: !remove }}
      loadingText={remove ? "取消管理员…" : "设置管理员…"}
      successText={remove ? "已取消管理员" : "已设置为管理员"}
    />
  );
}

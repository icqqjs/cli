import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置群头像";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "file", description: "图片文件路径" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function SetGroupAvatar({ args: [gid, file] }: Props) {
  return (
    <IpcMutate
      action={Actions.SET_GROUP_AVATAR}
      params={{ group_id: gid, file }}
      loadingText="设置群头像…"
      successText="群头像已更新"
    />
  );
}

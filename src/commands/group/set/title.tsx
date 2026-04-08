import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置群专属头衔";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
  zod.string().describe(argument({ name: "title", description: "头衔内容" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function SetGroupTitle({ args: [gid, uid, title] }: Props) {
  return (
    <IpcMutate
      action={Actions.SET_GROUP_TITLE}
      params={{ group_id: gid, user_id: uid, title }}
      loadingText="设置头衔…"
      successText={`群头衔已设置为「${title}」`}
    />
  );
}

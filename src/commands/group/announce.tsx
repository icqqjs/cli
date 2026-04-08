import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "发送群公告";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.string().describe(argument({ name: "content", description: "公告内容" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupAnnounce({ args: [gid, content] }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_ANNOUNCE}
      params={{ group_id: gid, content }}
      loadingText="发送公告…"
      successText="群公告已发送"
    />
  );
}

import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "戳一戳群成员";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupPoke({ args: [gid, uid] }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_POKE}
      params={{ group_id: gid, user_id: uid }}
      loadingText="戳一戳…"
      successText={`已戳 ${uid}`}
    />
  );
}

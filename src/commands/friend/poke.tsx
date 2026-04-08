import React from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "戳一戳好友";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "uid", description: "好友QQ号" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function FriendPoke({ args: [uid] }: Props) {
  return (
    <IpcMutate
      action={Actions.FRIEND_POKE}
      params={{ user_id: uid }}
      loadingText="戳一戳…"
      successText={`已戳 ${uid}`}
    />
  );
}

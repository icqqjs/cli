import React from "react";
import zod from "zod";
import { argument, option } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "给好友点赞";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "uid", description: "好友QQ号" })),
]);

export const options = zod.object({
  times: zod.number().default(1).describe(option({ description: "点赞次数(1-20)", alias: "t" })),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };

export default function FriendLike({ args: [uid], options: { times } }: Props) {
  return (
    <IpcMutate
      action={Actions.FRIEND_LIKE}
      params={{ user_id: uid, times }}
      loadingText="点赞中…"
      successText={`已给 ${uid} 点赞 ${times} 次`}
    />
  );
}

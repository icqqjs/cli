import React from "react";
import zod from "zod";
import { argument, option } from "pastel";
import { IpcMutate } from "../../components/IpcCommand.js";
import { Actions } from "../../daemon/protocol.js";

export const description = "禁言群成员";

export const args = zod.tuple([
  zod.number().describe(argument({ name: "gid", description: "群号" })),
  zod.number().describe(argument({ name: "uid", description: "QQ号" })),
]);

export const options = zod.object({
  duration: zod.number().default(600).describe(option({ description: "禁言时长(秒)，0=解除禁言", alias: "d" })),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };

export default function GroupMute({ args: [gid, uid], options: { duration } }: Props) {
  return (
    <IpcMutate
      action={Actions.GROUP_MUTE_MEMBER}
      params={{ group_id: gid, user_id: uid, duration }}
      loadingText="设置禁言…"
      successText={duration === 0 ? "已解除禁言" : `已禁言 ${duration} 秒`}
    />
  );
}

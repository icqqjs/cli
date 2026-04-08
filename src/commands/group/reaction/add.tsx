import React, { useState } from "react";
import zod from "zod";
import { argument } from "pastel";
import { IpcMutate } from "../../../components/IpcCommand.js";
import { Actions } from "../../../daemon/protocol.js";
import { GroupSelector } from "../../../components/GroupSelector.js";

export const description = "对群消息添加表态";

export const args = zod.tuple([
  zod.number().optional().describe(argument({ name: "gid", description: "群号（不填则交互选择）" })),
  zod.number().describe(argument({ name: "seq", description: "消息序列号" })),
  zod.string().describe(argument({ name: "id", description: "表情ID" })),
]);

type Props = { args: zod.infer<typeof args> };

export default function GroupReactionAdd({ args: [gid, seq, id] }: Props) {
  const [selectedGid, setSelectedGid] = useState(gid);
  if (selectedGid === undefined) return <GroupSelector onSelect={setSelectedGid} />;

  return (
    <IpcMutate
      action={Actions.GROUP_SET_REACTION}
      params={{ group_id: selectedGid, seq, id }}
      loadingText="添加表态…"
      successText="已添加表态"
    />
  );
}

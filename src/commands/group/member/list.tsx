import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { Table } from "@/components/Table.js";
import { GroupSelector } from "@/components/Selectors.js";
import { useIpcRequest } from "@/lib/use-ipc.js";
import { Actions } from "@/daemon/protocol.js";
import { isJsonMode } from "@/lib/json-mode.js";

export const description = "查看群成员列表";

export const args = zod.tuple([
  zod.number().optional().describe(
    argument({
      name: "gid",
      description: "群号（不填则交互选择）",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

function MemberList({ gid }: { gid: number }) {
  const { exit } = useApp();
  const { loading, data, error, uin } = useIpcRequest(
    Actions.LIST_GROUP_MEMBERS,
    { gid },
  );

  useEffect(() => {
    if (!loading) {
      if (isJsonMode()) {
        console.log(JSON.stringify(error ? { ok: false, error } : data));
        if (error) process.exitCode = 1;
        setTimeout(() => exit(), 0);
        return;
      }
      if (error) process.exitCode = 1;
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, data, error, exit]);

  if (isJsonMode()) return null;
  if (loading) return <Spinner label={`${uin ? `[${uin}] ` : ""}加载群 ${gid} 成员列表…`} />;
  if (error) return <Text color="red">✖ {error}</Text>;

  const members = (data as any[]) ?? [];
  if (members.length === 0) {
    return <Text dimColor>暂无成员数据</Text>;
  }

  return (
    <Table
      columns={[
        { key: "user_id", header: "QQ号", width: 12 },
        { key: "nickname", header: "昵称", width: 16 },
        { key: "card", header: "群名片", width: 16 },
        { key: "role", header: "角色", width: 8 },
        { key: "title", header: "头衔", width: 12 },
        { key: "level", header: "等级", width: 6 },
      ]}
      data={members}
    />
  );
}

export default function ListGroupMember({ args: [gid] }: Props) {
  const [selectedGid, setSelectedGid] = useState(gid);
  if (selectedGid === undefined) return <GroupSelector onSelect={setSelectedGid} />;

  return <MemberList gid={selectedGid} />;
}

import React, { useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { Table } from "@/components/Table.js";
import { useIpcRequest } from "@/lib/use-ipc.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看好友列表";

export default function ListFriend() {
  const { exit } = useApp();
  const { loading, data, error } = useIpcRequest(Actions.LIST_FRIENDS);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (loading) return <Spinner label="加载好友列表…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  const friends = (data as any[]) ?? [];
  if (friends.length === 0) {
    return <Text dimColor>暂无好友</Text>;
  }

  return (
    <Table
      columns={[
        { key: "user_id", header: "QQ号", width: 12 },
        { key: "nickname", header: "昵称", width: 20 },
        { key: "remark", header: "备注", width: 20 },
        { key: "sex", header: "性别", width: 6 },
      ]}
      data={friends}
    />
  );
}

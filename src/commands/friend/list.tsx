import React, { useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { Table } from "@/components/Table.js";
import { useIpcRequest } from "@/lib/use-ipc.js";
import { Actions } from "@/daemon/protocol.js";
import { isJsonMode } from "@/lib/json-mode.js";

export const description = "查看好友列表";

export default function ListFriend() {
  const { exit } = useApp();
  const { loading, data, error, uin } = useIpcRequest(Actions.LIST_FRIENDS);

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
  if (loading) return <Spinner label={`${uin ? `[${uin}] ` : ""}加载好友列表…`} />;
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

import React, { useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { Table } from "@/components/Table.js";
import { useIpcRequest } from "@/lib/use-ipc.js";
import { Actions } from "@/daemon/protocol.js";
import { isJsonMode } from "@/lib/json-mode.js";

export const description = "查看群组列表";

export default function ListGroup() {
  const { exit } = useApp();
  const { loading, data, error, uin } = useIpcRequest(Actions.LIST_GROUPS);

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
  if (loading) return <Spinner label={`${uin ? `[${uin}] ` : ""}加载群列表…`} />;
  if (error) return <Text color="red">✖ {error}</Text>;

  const groups = (data as any[]) ?? [];
  if (groups.length === 0) {
    return <Text dimColor>暂无群组</Text>;
  }

  return (
    <Table
      columns={[
        { key: "group_id", header: "群号", width: 12 },
        { key: "group_name", header: "群名", width: 30 },
        { key: "member_count", header: "成员数", width: 8 },
        { key: "max_member_count", header: "上限", width: 8 },
        { key: "owner_id", header: "群主", width: 12 },
      ]}
      data={groups}
    />
  );
}

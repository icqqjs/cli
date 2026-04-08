import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { Actions } from "@/daemon/protocol.js";

type GroupItem = {
  group_id: number;
  group_name: string;
  member_count: number;
};

type Props = {
  onSelect: (gid: number) => void;
};

function GroupList({ ipc, onSelect }: { ipc: IpcClient; onSelect: (gid: number) => void }) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const resp = await ipc.request(Actions.LIST_GROUPS);
        if (resp.ok && Array.isArray(resp.data)) {
          setGroups(resp.data as GroupItem[]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [ipc]);

  const filtered = filter
    ? groups.filter(
        (g) =>
          g.group_name.toLowerCase().includes(filter.toLowerCase()) ||
          String(g.group_id).includes(filter),
      )
    : groups;

  useInput((char, key) => {
    if (key.return) {
      const item = filtered[index];
      if (item) {
        ipc.close();
        onSelect(item.group_id);
      }
      return;
    }
    if (key.upArrow) {
      setIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.downArrow) {
      setIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (key.backspace || key.delete) {
      setFilter((q) => q.slice(0, -1));
      setIndex(0);
      return;
    }
    if (char && !key.ctrl && !key.meta) {
      setFilter((q) => q + char);
      setIndex(0);
    }
  });

  if (loading) return <Spinner label="加载群列表…" />;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">选择群 <Text dimColor>(↑↓ 选择 | 输入过滤 | Enter 确认)</Text></Text>
      <Text>搜索: {filter}<Text color="cyan">█</Text></Text>
      <Box flexDirection="column" marginTop={1}>
        {filtered.slice(0, 15).map((g, i) => (
          <Text key={g.group_id}>
            {i === index ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
            <Text bold>{g.group_name}</Text>
            <Text dimColor> ({g.group_id}) · {g.member_count}人</Text>
          </Text>
        ))}
        {filtered.length === 0 && <Text dimColor>无匹配群</Text>}
        {filtered.length > 15 && <Text dimColor>… 还有 {filtered.length - 15} 个群</Text>}
      </Box>
    </Box>
  );
}

export function GroupSelector({ onSelect }: Props) {
  const [ipc, setIpc] = useState<IpcClient | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");
        const client = await IpcClient.connect(uin);
        setIpc(client);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) return <Text color="red">✖ {error}</Text>;
  if (!ipc) return <Spinner label="连接守护进程…" />;

  return <GroupList ipc={ipc} onSelect={onSelect} />;
}

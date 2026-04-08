import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./Spinner.js";
import { loadConfig } from "../lib/config.js";
import { IpcClient } from "../lib/ipc-client.js";
import { isDaemonRunning } from "../daemon/lifecycle.js";
import { Actions } from "../daemon/protocol.js";

type MemberItem = {
  user_id: number;
  nickname: string;
  card: string;
  role: string;
};

type Props = {
  gid: number;
  onSelect: (uid: number) => void;
};

function MemberList({ ipc, gid, onSelect }: { ipc: IpcClient; gid: number; onSelect: (uid: number) => void }) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const resp = await ipc.request(Actions.LIST_GROUP_MEMBERS, { gid });
        if (resp.ok && Array.isArray(resp.data)) {
          setMembers(resp.data as MemberItem[]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [ipc, gid]);

  const filtered = filter
    ? members.filter(
        (m) =>
          m.nickname.toLowerCase().includes(filter.toLowerCase()) ||
          (m.card && m.card.toLowerCase().includes(filter.toLowerCase())) ||
          String(m.user_id).includes(filter),
      )
    : members;

  useInput((char, key) => {
    if (key.return) {
      const item = filtered[index];
      if (item) {
        ipc.close();
        onSelect(item.user_id);
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

  if (loading) return <Spinner label={`加载群 ${gid} 成员列表…`} />;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">选择成员 <Text dimColor>(↑↓ 选择 | 输入过滤 | Enter 确认)</Text></Text>
      <Text>搜索: {filter}<Text color="cyan">█</Text></Text>
      <Box flexDirection="column" marginTop={1}>
        {filtered.slice(0, 15).map((m, i) => (
          <Text key={m.user_id}>
            {i === index ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
            <Text bold>{m.card || m.nickname}</Text>
            {m.card && <Text dimColor> ({m.nickname})</Text>}
            <Text dimColor> · {m.user_id}</Text>
            {m.role !== "member" && <Text color={m.role === "owner" ? "red" : "yellow"}> [{m.role === "owner" ? "群主" : "管理"}]</Text>}
          </Text>
        ))}
        {filtered.length === 0 && <Text dimColor>无匹配成员</Text>}
        {filtered.length > 15 && <Text dimColor>… 还有 {filtered.length - 15} 人</Text>}
      </Box>
    </Box>
  );
}

export function MemberSelector({ gid, onSelect }: Props) {
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

  return <MemberList ipc={ipc} gid={gid} onSelect={onSelect} />;
}

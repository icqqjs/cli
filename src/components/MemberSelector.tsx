import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./Spinner.js";
import { useIpcConnection } from "@/lib/use-ipc-connection.js";
import type { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

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

const PAGE = 15;

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

  const scrollTop = Math.max(0, Math.min(index - PAGE + 1, filtered.length - PAGE));
  const visible = filtered.slice(scrollTop, scrollTop + PAGE);

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
        {visible.map((m) => {
          const i = filtered.indexOf(m);
          return (
            <Text key={m.user_id}>
              {i === index ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
              <Text bold>{m.card || m.nickname}</Text>
              {m.card && <Text dimColor> ({m.nickname})</Text>}
              <Text dimColor> · {m.user_id}</Text>
              {m.role !== "member" && <Text color={m.role === "owner" ? "red" : "yellow"}> [{m.role === "owner" ? "群主" : "管理"}]</Text>}
            </Text>
          );
        })}
        {filtered.length === 0 && <Text dimColor>无匹配成员</Text>}
        {filtered.length > PAGE && (
          <Text dimColor>{index + 1}/{filtered.length}</Text>
        )}
      </Box>
    </Box>
  );
}

export function MemberSelector({ gid, onSelect }: Props) {
  const { ipc, error } = useIpcConnection();

  if (error) return <Text color="red">✖ {error}</Text>;
  if (!ipc) return <Spinner label="连接守护进程…" />;

  return <MemberList ipc={ipc} gid={gid} onSelect={onSelect} />;
}

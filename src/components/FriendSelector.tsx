import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./Spinner.js";
import { useIpcConnection } from "@/lib/use-ipc-connection.js";
import type { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

type FriendItem = {
  user_id: number;
  nickname: string;
  remark: string;
};

type Props = {
  onSelect: (uid: number) => void;
};

const PAGE = 15;

function FriendList({ ipc, onSelect }: { ipc: IpcClient; onSelect: (uid: number) => void }) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const resp = await ipc.request(Actions.LIST_FRIENDS);
        if (resp.ok && Array.isArray(resp.data)) {
          setFriends(resp.data as FriendItem[]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [ipc]);

  const filtered = filter
    ? friends.filter(
        (f) =>
          f.nickname.toLowerCase().includes(filter.toLowerCase()) ||
          (f.remark && f.remark.toLowerCase().includes(filter.toLowerCase())) ||
          String(f.user_id).includes(filter),
      )
    : friends;

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

  if (loading) return <Spinner label="加载好友列表…" />;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">选择好友 <Text dimColor>(↑↓ 选择 | 输入过滤 | Enter 确认)</Text></Text>
      <Text>搜索: {filter}<Text color="cyan">█</Text></Text>
      <Box flexDirection="column" marginTop={1}>
        {visible.map((f) => {
          const i = filtered.indexOf(f);
          return (
            <Text key={f.user_id}>
              {i === index ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
              <Text bold>{f.remark || f.nickname}</Text>
              {f.remark && <Text dimColor> ({f.nickname})</Text>}
              <Text dimColor> · {f.user_id}</Text>
            </Text>
          );
        })}
        {filtered.length === 0 && <Text dimColor>无匹配好友</Text>}
        {filtered.length > PAGE && (
          <Text dimColor>{index + 1}/{filtered.length}</Text>
        )}
      </Box>
    </Box>
  );
}

export function FriendSelector({ onSelect }: Props) {
  const { ipc, error } = useIpcConnection();

  if (error) return <Text color="red">✖ {error}</Text>;
  if (!ipc) return <Spinner label="连接守护进程…" />;

  return <FriendList ipc={ipc} onSelect={onSelect} />;
}

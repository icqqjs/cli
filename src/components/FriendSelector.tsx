import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { Spinner } from "./Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { Actions } from "@/daemon/protocol.js";

type FriendItem = {
  user_id: number;
  nickname: string;
  remark: string;
};

type Props = {
  onSelect: (uid: number) => void;
};

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
        {filtered.slice(0, 15).map((f, i) => (
          <Text key={f.user_id}>
            {i === index ? <Text color="yellow">❯ </Text> : <Text>  </Text>}
            <Text bold>{f.remark || f.nickname}</Text>
            {f.remark && <Text dimColor> ({f.nickname})</Text>}
            <Text dimColor> · {f.user_id}</Text>
          </Text>
        ))}
        {filtered.length === 0 && <Text dimColor>无匹配好友</Text>}
        {filtered.length > 15 && <Text dimColor>… 还有 {filtered.length - 15} 人</Text>}
      </Box>
    </Box>
  );
}

export function FriendSelector({ onSelect }: Props) {
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

  return <FriendList ipc={ipc} onSelect={onSelect} />;
}

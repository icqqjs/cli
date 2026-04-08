import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { FriendSelector } from "@/components/FriendSelector.js";
import { loadConfig } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看好友资料";

export const args = zod.tuple([
  zod.number().optional().describe(
    argument({
      name: "uid",
      description: "好友QQ号（不填则交互选择）",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

function FriendInfo({ uid }: { uid: number }) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(Actions.GET_FRIEND_INFO, { uid });
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setInfo(resp.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [uid]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (loading) return <Spinner label="查询好友资料…" />;
  if (error) return <Text color="red">✖ {error}</Text>;
  if (!info) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        好友资料
      </Text>
      <Text>QQ号: {info.user_id}</Text>
      <Text>昵称: {info.nickname}</Text>
      {info.remark && <Text>备注: {info.remark}</Text>}
      {info.sex !== undefined && <Text>性别: {info.sex}</Text>}
      {info.age !== undefined && <Text>年龄: {info.age}</Text>}
      {info.area && <Text>地区: {info.area}</Text>}
    </Box>
  );
}

export default function ViewFriend({ args: [uid] }: Props) {
  const [selectedUid, setSelectedUid] = useState(uid);
  if (selectedUid === undefined) return <FriendSelector onSelect={setSelectedUid} />;
  return <FriendInfo uid={selectedUid} />;
}

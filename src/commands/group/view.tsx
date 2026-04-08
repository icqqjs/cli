import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { GroupSelector } from "@/components/GroupSelector.js";
import { resolveUin } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看群资料";

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

function formatDate(ts: number): string {
  if (!ts) return "未知";
  return new Date(ts * 1000).toLocaleString("zh-CN");
}

function GroupInfo({ gid }: { gid: number }) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const uin = await resolveUin();
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(Actions.GET_GROUP_INFO, { gid });
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setInfo(resp.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [gid]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="查询群资料…" />;
  if (error) return <Text color="red">✖ {error}</Text>;
  if (!info) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        群资料
      </Text>
      <Text>群号: {info.group_id}</Text>
      <Text>群名: {info.group_name}</Text>
      <Text>
        成员: {info.member_count}/{info.max_member_count}
      </Text>
      <Text>群主: {info.owner_id}</Text>
      {info.create_time && (
        <Text>创建时间: {formatDate(info.create_time)}</Text>
      )}
      {info.last_join_time && (
        <Text>最后加入: {formatDate(info.last_join_time)}</Text>
      )}
      {info.grade !== undefined && <Text>等级: {info.grade}</Text>}
    </Box>
  );
}

export default function ViewGroup({ args: [gid] }: Props) {
  const [selectedGid, setSelectedGid] = useState(gid);
  if (selectedGid === undefined) return <GroupSelector onSelect={setSelectedGid} />;
  return <GroupInfo gid={selectedGid} />;
}

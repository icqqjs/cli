import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { GroupSelector } from "@/components/GroupSelector.js";
import { MemberSelector } from "@/components/MemberSelector.js";
import { resolveUin } from "@/lib/config.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看群成员资料";

export const args = zod.tuple([
  zod.number().optional().describe(
    argument({
      name: "gid",
      description: "群号（不填则交互选择）",
    }),
  ),
  zod.number().optional().describe(
    argument({
      name: "uid",
      description: "成员QQ号（不填则交互选择）",
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

const roleMap: Record<string, string> = {
  owner: "群主",
  admin: "管理员",
  member: "成员",
};

function MemberInfo({ gid, uid }: { gid: number; uid: number }) {
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
        const resp = await ipc.request(Actions.GET_GROUP_MEMBER_INFO, {
          gid,
          uid,
        });
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setInfo(resp.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [gid, uid]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="查询群成员资料…" />;
  if (error) return <Text color="red">✖ {error}</Text>;
  if (!info) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        群成员资料
      </Text>
      <Text>QQ号: {info.user_id}</Text>
      <Text>昵称: {info.nickname}</Text>
      {info.card && <Text>群名片: {info.card}</Text>}
      <Text>角色: {roleMap[info.role] ?? info.role}</Text>
      {info.title && <Text>头衔: {info.title}</Text>}
      <Text>等级: {info.level}</Text>
      <Text>加入时间: {formatDate(info.join_time)}</Text>
      <Text>最后发言: {formatDate(info.last_sent_time)}</Text>
      {info.shutup_time > 0 && (
        <Text color="red">
          禁言至: {formatDate(info.shutup_time)}
        </Text>
      )}
    </Box>
  );
}

export default function ViewGroupMember({ args: [gid, uid] }: Props) {
  const [selectedGid, setSelectedGid] = useState(gid);
  const [selectedUid, setSelectedUid] = useState(uid);

  if (selectedGid === undefined) return <GroupSelector onSelect={setSelectedGid} />;
  if (selectedUid === undefined) return <MemberSelector gid={selectedGid} onSelect={setSelectedUid} />;
  return <MemberInfo gid={selectedGid} uid={selectedUid} />;
}

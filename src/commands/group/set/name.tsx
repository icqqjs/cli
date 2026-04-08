import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "../../../components/Spinner.js";
import { GroupSelector } from "../../../components/GroupSelector.js";
import { loadConfig } from "../../../lib/config.js";
import { IpcClient } from "../../../lib/ipc-client.js";
import { isDaemonRunning } from "../../../daemon/lifecycle.js";
import { Actions } from "../../../daemon/protocol.js";

export const description = "设置群名称";

export const args = zod.tuple([
  zod.number().optional().describe(
    argument({
      name: "gid",
      description: "群号（不填则交互选择）",
    }),
  ),
  zod.string().optional().describe(
    argument({
      name: "name",
      description: "新群名称",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function SetGroupName({ args: [gid, name] }: Props) {
  const { exit } = useApp();
  const [selectedGid, setSelectedGid] = useState(gid);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (selectedGid === undefined) return <GroupSelector onSelect={setSelectedGid} />;

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(Actions.SET_GROUP_NAME, {
          gid: selectedGid,
          name,
        });
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "设置失败");
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [selectedGid, name]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (loading) return <Spinner label="设置群名称…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Text color="green">
      ✔ 已将群 {selectedGid} 的名称设置为「{name}」
    </Text>
  );
}

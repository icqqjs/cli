import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { isDaemonRunning, getDaemonPid } from "@/daemon/lifecycle.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看守护进程状态";

export default function Status() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);
  const [pid, setPid] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");

        const running = await isDaemonRunning(uin);
        if (!running)
          throw new Error(`守护进程未运行 (账号 ${uin})，请先执行 icqq login`);

        const p = await getDaemonPid(uin);
        setPid(p);

        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(Actions.GET_STATUS);
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setInfo(resp.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (loading) return <Spinner label="查询中…" />;
  if (error) return <Text color="red">✖ {error}</Text>;
  if (!info) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        守护进程状态
      </Text>
      <Text>
        状态:{" "}
        <Text color={info.online ? "green" : "red"}>
          {info.online ? "● 在线" : "○ 离线"}
        </Text>
      </Text>
      <Text>QQ号: {info.uin}</Text>
      <Text>昵称: {info.nickname}</Text>
      <Text>PID: {pid ?? "未知"}</Text>
      <Text>好友: {info.friendCount}</Text>
      <Text>群组: {info.groupCount}</Text>
    </Box>
  );
}

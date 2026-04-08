import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看当前通知配置";

export default function NotifyView() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
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

        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(Actions.GET_NOTIFY);
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setEnabled((resp.data as any)?.notifyEnabled ?? false);
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

  return (
    <Text>
      系统通知：{enabled ? <Text color="green">已开启 ✔</Text> : <Text color="gray">已关闭</Text>}
    </Text>
  );
}

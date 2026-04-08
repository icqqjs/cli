import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "../components/Spinner.js";
import { loadConfig } from "../lib/config.js";
import {
  isDaemonRunning,
  stopDaemon,
} from "../daemon/lifecycle.js";

export const description = "停止守护进程";

export default function Stop() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号");

        if (!(await isDaemonRunning(uin))) {
          setMessage(`守护进程未运行 (账号 ${uin})`);
          setLoading(false);
          return;
        }

        const ok = await stopDaemon(uin);
        if (ok) {
          setMessage(`守护进程已停止 (账号 ${uin})`);
          setSuccess(true);
        } else {
          setMessage("停止守护进程失败");
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e));
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

  if (loading) return <Spinner label="正在停止守护进程…" />;

  return (
    <Text color={success ? "green" : "yellow"}>
      {success ? "✔" : "⚠"} {message}
    </Text>
  );
}

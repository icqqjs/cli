import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { resolveUin } from "@/lib/config.js";
import {
  isDaemonRunning,
  stopDaemon,
} from "@/daemon/lifecycle.js";

export const description = "停止守护进程";

export const args = zod.tuple([
  zod.coerce.number().optional().describe(
    argument({
      name: "uin",
      description: "要停止的QQ号（不指定则使用当前账号）",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function Stop({ args: [argUin] }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const uin = argUin ?? await resolveUin();

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
  }, [argUin]);

  useEffect(() => {
    if (!loading) {
      if (message && !success) process.exitCode = 1;
      const timer = setTimeout(() => exit(), message && !success ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, message, success, exit]);

  if (loading) return <Spinner label="正在停止守护进程…" />;

  return (
    <Text color={success ? "green" : "yellow"}>
      {success ? "✔" : "⚠"} {message}
    </Text>
  );
}

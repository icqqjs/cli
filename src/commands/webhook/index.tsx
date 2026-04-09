import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看所有实例的 Webhook 配置";

type WebhookInfo = {
  uin: number;
  url?: string;
  error?: string;
};

export default function WebhookView() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<WebhookInfo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uins = Object.keys(config.accounts).map(Number).filter((n) => !Number.isNaN(n));
        if (uins.length === 0) {
          setError("无已配置的账号，请先执行 icqq login");
          setLoading(false);
          return;
        }

        const res = await Promise.all(
          uins.map(async (uin): Promise<WebhookInfo> => {
            const info: WebhookInfo = { uin };
            if (!(await isDaemonRunning(uin))) {
              info.error = "未运行";
              return info;
            }
            try {
              const ipc = await IpcClient.connect(uin);
              const resp = await ipc.request(Actions.GET_WEBHOOK);
              ipc.close();
              if (!resp.ok) throw new Error(resp.error ?? "请求失败");
              info.url = (resp.data as any)?.url ?? "";
            } catch (e) {
              info.error = e instanceof Error ? e.message : String(e);
            }
            return info;
          }),
        );

        setResults(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (error) process.exitCode = 1;
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="查询中…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">Webhook 配置</Text>
      {results.map((r) => (
        <Text key={r.uin}>
          <Text bold>{r.uin}</Text>
          {"  "}
          {r.error ? (
            <Text dimColor>{r.error}</Text>
          ) : r.url ? (
            <Text color="green">{r.url}</Text>
          ) : (
            <Text dimColor>未配置</Text>
          )}
        </Text>
      ))}
    </Box>
  );
}

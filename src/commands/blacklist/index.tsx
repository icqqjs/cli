import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";
import { Table } from "@/components/Table.js";

export const description = "查看所有账号的黑名单";

type BlacklistInfo = {
  uin: number;
  data?: any[];
  error?: string;
};

export default function ListBlacklist() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<BlacklistInfo[]>([]);
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
          uins.map(async (uin): Promise<BlacklistInfo> => {
            const info: BlacklistInfo = { uin };
            if (!(await isDaemonRunning(uin))) {
              info.error = "未运行";
              return info;
            }
            try {
              const ipc = await IpcClient.connect(uin);
              const resp = await ipc.request(Actions.LIST_BLACKLIST);
              ipc.close();
              if (!resp.ok) throw new Error(resp.error ?? "请求失败");
              info.data = resp.data as any[];
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

  if (loading) return <Spinner label="获取黑名单…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      {results.map((r) => (
        <Box key={r.uin} flexDirection="column">
          <Text bold color="cyan">账号 {r.uin}</Text>
          {r.error ? (
            <Text dimColor>  {r.error}</Text>
          ) : r.data && r.data.length > 0 ? (
            <Table
              columns={[
                { key: "QQ号", header: "QQ号" },
                { key: "昵称", header: "昵称" },
              ]}
              data={r.data.map((u: any) => ({
                QQ号: u.user_id,
                昵称: u.nickname ?? "",
              }))}
            />
          ) : (
            <Text dimColor>  黑名单为空</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

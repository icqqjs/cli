/**
 * icqq service status — 全局系统服务状态 + 各账号守护进程状态。
 */
import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { queryService, getAllUins } from "./_helpers.js";
import { readMcpEndpoint, formatMcpUrl } from "@/lib/paths.js";
import { resolveMcpConfig, loadConfig } from "@/lib/config.js";
import { getDaemonPid, isDaemonRunning } from "@/daemon/lifecycle.js";
import type { ServiceState } from "./_helpers.js";

export const description = "查看 icqq 全局系统服务与各账号守护进程状态";

type AccountRow = {
  uin: number;
  daemonRunning: boolean;
  daemonPid: number | null;
  mcpUrl: string | null;
  isCurrent: boolean;
};

function AccountLine({ row }: { row: AccountRow }) {
  const tag = row.isCurrent ? "*" : " ";
  const daemon = row.daemonRunning
    ? `守护:运行中${row.daemonPid ? ` PID:${row.daemonPid}` : ""}`
    : "守护:未运行";
  return (
    <Text>
      <Text dimColor>{tag} </Text>
      <Text color={row.isCurrent ? "cyan" : undefined} bold={row.isCurrent}>
        [{row.uin}]
      </Text>
      {" "}
      <Text color={row.daemonRunning ? "green" : "yellow"}>{daemon}</Text>
      {row.mcpUrl ? <Text color="cyan"> MCP:{row.mcpUrl}</Text> : null}
    </Text>
  );
}

function GlobalServiceBlock({ s }: { s: ServiceState }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>icqq 全局系统服务</Text>
      <Box gap={1}>
        <Text bold>已安装：</Text>
        <Text color={s.installed ? "green" : "red"}>{s.installed ? "是" : "否"}</Text>
      </Box>
      {s.installed && (
        <>
          <Box gap={1}>
            <Text bold>运行中：</Text>
            <Text color={s.running ? "green" : "yellow"}>{s.running ? "是" : "否"}</Text>
          </Box>
          {s.running && s.pid !== null && (
            <Box gap={1}><Text bold>Supervisor PID：</Text><Text>{s.pid}</Text></Box>
          )}
          {!s.running && s.lastExitCode !== null && (
            <Box gap={1}>
              <Text bold>上次退出码：</Text>
              <Text color={s.lastExitCode === 0 ? "green" : "red"}>{s.lastExitCode}</Text>
            </Box>
          )}
          <Box gap={1}><Text bold>服务文件：</Text><Text dimColor>{s.filePath}</Text></Box>
        </>
      )}
    </Box>
  );
}

export default function ServiceStatus() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceState | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    void (async () => {
      const platform = process.platform;
      if (platform !== "darwin" && platform !== "linux") {
        setFatalError(`不支持当前平台: ${platform}。仅支持 macOS 和 Linux。`);
        setLoading(false);
        return;
      }
      try {
        const svc = await queryService();
        setService(svc);

        const config = await loadConfig();
        const mcpCfg = resolveMcpConfig(config.mcp);
        const uins = await getAllUins();
        const rows: AccountRow[] = [];
        for (const uin of uins) {
          let mcpUrl: string | null = null;
          if (mcpCfg.enabled) {
            const ep = await readMcpEndpoint(uin);
            if (ep) mcpUrl = formatMcpUrl(ep);
          }
          const daemonRunning = await isDaemonRunning(uin);
          const daemonPid = daemonRunning ? await getDaemonPid(uin) : null;
          rows.push({
            uin,
            daemonRunning,
            daemonPid,
            mcpUrl,
            isCurrent: config.currentUin === uin,
          });
        }
        setAccounts(rows);
      } catch (e) {
        setFatalError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (fatalError) process.exitCode = 1;
      setTimeout(exit, 0);
    }
  }, [loading, fatalError, exit]);

  if (loading) return <Spinner label="查询服务状态…" />;
  if (fatalError) return <Text color="red">错误: {fatalError}</Text>;
  if (!service) return null;

  return (
    <Box flexDirection="column">
      <GlobalServiceBlock s={service} />
      <Text bold>账号守护进程</Text>
      {accounts.length === 0 ? (
        <Text dimColor>未配置账号，请先 icqq login</Text>
      ) : (
        <>
          <Text dimColor>共 {accounts.length} 个账号（* 为 currentUin）</Text>
          {accounts.map((row) => (
            <AccountLine key={row.uin} row={row} />
          ))}
        </>
      )}
    </Box>
  );
}

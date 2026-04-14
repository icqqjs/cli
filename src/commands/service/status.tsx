/**
 * icqq service status — 查询系统服务是否已安装及其运行状态。
 * 选项 -a 可查看所有已配置账号的服务状态。
 */
import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument, option } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { queryService, resolveUins, type ServiceState } from "./_helpers.js";

export const description = "查看系统服务安装及运行状态";

export const args = zod.tuple([
  zod.coerce.number().optional().describe(
    argument({ name: "uin", description: "要查询的QQ号（不指定则使用当前账号）" }),
  ),
]);

export const options = zod.object({
  a: zod.boolean().default(false).describe(
    option({ description: "查看所有已配置账号的服务状态", alias: "a" }),
  ),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };
type UinState = { uin: number } & ServiceState;

export default function ServiceStatus({ args: [argUin], options: { a: all } }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<UinState[]>([]);
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
        const uins = await resolveUins(argUin, all);
        const out = await Promise.all(
          uins.map(async (uin) => ({ uin, ...(await queryService(uin)) })),
        );
        setResults(out);
      } catch (e) {
        setFatalError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [argUin, all]);

  useEffect(() => {
    if (!loading) {
      if (fatalError) process.exitCode = 1;
      setTimeout(exit, 0);
    }
  }, [loading, fatalError, exit]);

  if (loading) return <Spinner label="查询服务状态…" />;
  if (fatalError) return <Text color="red">错误: {fatalError}</Text>;

  // Single account: vertical detail view
  if (results.length === 1) {
    const s = results[0]!;
    return (
      <Box flexDirection="column">
        <Box gap={1}><Text bold>已安装：</Text><Text color={s.installed ? "green" : "red"}>{s.installed ? "是" : "否"}</Text></Box>
        {s.installed && (
          <>
            <Box gap={1}><Text bold>运行中：</Text><Text color={s.running ? "green" : "yellow"}>{s.running ? "是" : "否"}</Text></Box>
            {s.running && s.pid !== null && <Box gap={1}><Text bold>PID：</Text><Text>{s.pid}</Text></Box>}
            {!s.running && s.lastExitCode !== null && (
              <Box gap={1}><Text bold>上次退出码：</Text><Text color={s.lastExitCode === 0 ? "green" : "red"}>{s.lastExitCode}</Text></Box>
            )}
            <Box gap={1}><Text bold>服务文件：</Text><Text dimColor>{s.filePath}</Text></Box>
          </>
        )}
      </Box>
    );
  }

  // Multiple accounts: one line per account
  return (
    <Box flexDirection="column">
      {results.map((s) => {
        const installed = s.installed ? "已安装" : "未安装";
        const running = !s.installed ? "-" : s.running ? "运行中" : "已停止";
        const pid = s.running && s.pid ? `PID:${s.pid}` : "";
        const exit = !s.running && s.lastExitCode !== null ? `退出:${s.lastExitCode}` : "";
        return (
          <Text key={s.uin}>
            <Text color={s.installed ? "green" : "red"}>[{s.uin}]</Text>
            {" "}{installed}
            {" "}<Text color={s.running ? "green" : "yellow"}>{running}</Text>
            {pid ? <Text dimColor>  {pid}</Text> : null}
            {exit ? <Text color={s.lastExitCode !== 0 ? "red" : undefined}>  {exit}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}

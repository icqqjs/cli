/**
 * icqq service uninstall — 从系统服务管理器中移除守护进程服务。
 * 选项 -a 可一次性卸载所有已配置账号的服务。
 */
import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument, option } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { uninstallService, resolveUins } from "./_helpers.js";

export const description = "卸载系统服务（取消开机自启和自动重启）";

export const args = zod.tuple([
  zod.coerce.number().optional().describe(
    argument({ name: "uin", description: "要卸载服务的QQ号（不指定则使用当前账号）" }),
  ),
]);

export const options = zod.object({
  a: zod.boolean().default(false).describe(
    option({ description: "卸载所有已配置账号的系统服务", alias: "a" }),
  ),
});

type Props = { args: zod.infer<typeof args>; options: zod.infer<typeof options> };
type Result = { uin: number; ok: boolean; message: string };

export default function ServiceUninstall({ args: [argUin], options: { a: all } }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
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
        const out: Result[] = [];
        for (const uin of uins) {
          try {
            await uninstallService(uin, () => {});
            out.push({ uin, ok: true, message: "已卸载" });
          } catch (e) {
            out.push({ uin, ok: false, message: e instanceof Error ? e.message : String(e) });
          }
        }
        setResults(out);
      } catch (e) {
        setFatalError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [argUin, all]);

  useEffect(() => {
    if (!loading) {
      if (fatalError || results.some((r) => !r.ok)) process.exitCode = 1;
      setTimeout(exit, 0);
    }
  }, [loading, fatalError, results, exit]);

  if (loading) return <Spinner label="卸载系统服务…" />;
  if (fatalError) return <Text color="red">错误: {fatalError}</Text>;

  return (
    <Box flexDirection="column">
      {results.map((r) => (
        <Text key={r.uin} color={r.ok ? "green" : "red"}>
          {r.ok ? "✓" : "✗"} [{r.uin}] {r.ok ? "系统服务已卸载，不再自动重启" : r.message}
        </Text>
      ))}
    </Box>
  );
}

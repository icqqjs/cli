/**
 * icqq service install — 将守护进程注册为系统服务（每账号一个 plist/unit）。
 * 不指定 QQ 号时默认安装所有已配置账号。
 */
import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { installService, resolveServiceUins } from "./_helpers.js";

export const description = "安装系统服务（默认全部已配置账号；可指定 QQ 号）";

export const args = zod.tuple([
  zod.coerce.number().optional().describe(
    argument({
      name: "uin",
      description: "仅安装该 QQ 号的服务（不指定则安装全部已配置账号）",
    }),
  ),
]);

type Props = { args: zod.infer<typeof args> };
type Result = { uin: number; ok: boolean; message: string };

export default function ServiceInstall({ args: [argUin] }: Props) {
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
        const uins = await resolveServiceUins(argUin);
        const out: Result[] = [];
        for (const uin of uins) {
          try {
            await installService(uin, () => {});
            out.push({ uin, ok: true, message: "已安装" });
          } catch (e) {
            out.push({
              uin,
              ok: false,
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }
        setResults(out);
      } catch (e) {
        setFatalError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [argUin]);

  useEffect(() => {
    if (!loading) {
      if (fatalError || results.some((r) => !r.ok)) process.exitCode = 1;
      setTimeout(exit, 0);
    }
  }, [loading, fatalError, results, exit]);

  if (loading) return <Spinner label="安装系统服务…" />;
  if (fatalError) return <Text color="red">错误: {fatalError}</Text>;

  return (
    <Box flexDirection="column">
      {results.map((r) => (
        <Text key={r.uin} color={r.ok ? "green" : "red"}>
          {r.ok ? "✓" : "✗"} [{r.uin}] {r.ok ? "系统服务已安装并启动" : r.message}
        </Text>
      ))}
      {results.some((r) => r.ok) && (
        <Text dimColor>
          注意：`icqq logout` 不会阻止服务自动重启，永久停止请 `icqq service uninstall`
        </Text>
      )}
    </Box>
  );
}

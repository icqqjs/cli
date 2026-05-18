/**
 * icqq service start — 启动已安装的系统服务。
 * 不指定 QQ 号时默认启动所有已配置账号。
 */
import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { startService, resolveServiceUins } from "./_helpers.js";

export const description = "启动系统服务（默认全部已配置账号；可指定 QQ 号）";

export const args = zod.tuple([
  zod.coerce.number().optional().describe(
    argument({
      name: "uin",
      description: "仅启动该 QQ 号的服务（不指定则启动全部已配置账号）",
    }),
  ),
]);

type Props = { args: zod.infer<typeof args> };
type Result = { uin: number; ok: boolean; message: string };

export default function ServiceStart({ args: [argUin] }: Props) {
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
            await startService(uin, () => {});
            out.push({ uin, ok: true, message: "已启动" });
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

  if (loading) return <Spinner label="启动系统服务…" />;
  if (fatalError) return <Text color="red">错误: {fatalError}</Text>;

  return (
    <Box flexDirection="column">
      {results.map((r) => (
        <Text key={r.uin} color={r.ok ? "green" : "red"}>
          {r.ok ? "✓" : "✗"} [{r.uin}] {r.ok ? "系统服务已启动" : r.message}
        </Text>
      ))}
    </Box>
  );
}

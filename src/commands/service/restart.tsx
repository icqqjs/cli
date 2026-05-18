/**
 * icqq service restart — 重启全局系统服务（加载 MCP 等新配置）。
 */
import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { restartService } from "./_helpers.js";

export const description = "重启 icqq 全局系统服务";

export default function ServiceRestart() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const platform = process.platform;
      if (platform !== "darwin" && platform !== "linux") {
        setError(`不支持当前平台: ${platform}。仅支持 macOS 和 Linux。`);
        setLoading(false);
        return;
      }
      try {
        await restartService(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (error) process.exitCode = 1;
      setTimeout(exit, 0);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="重启系统服务…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return <Text color="green">✓ icqq 全局系统服务已重启</Text>;
}

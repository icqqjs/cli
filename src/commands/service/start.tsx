/**
 * icqq service start — 启动已安装的全局系统服务。
 */
import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { startService } from "./_helpers.js";

export const description = "启动 icqq 全局系统服务";

export default function ServiceStart() {
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
        await startService(() => {});
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

  if (loading) return <Spinner label="启动系统服务…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return <Text color="green">✓ icqq 全局系统服务已启动</Text>;
}

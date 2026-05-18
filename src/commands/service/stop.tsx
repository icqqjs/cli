/**
 * icqq service stop — 停止全局系统服务（保留 unit/plist，不删除）。
 */
import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { stopService } from "./_helpers.js";

export const description = "停止 icqq 全局系统服务（保留安装文件）";

export default function ServiceStop() {
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
        await stopService(() => {});
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

  if (loading) return <Spinner label="停止系统服务…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Text color="green">
      ✓ icqq 全局系统服务已停止（执行 `icqq service start` 可重新启动）
    </Text>
  );
}

/**
 * icqq service uninstall — 卸载全局系统服务。
 */
import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { uninstallService } from "./_helpers.js";

export const description = "卸载 icqq 全局系统服务";

export default function ServiceUninstall() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      const platform = process.platform;
      if (platform !== "darwin" && platform !== "linux") {
        setError(`不支持当前平台: ${platform}。仅支持 macOS 和 Linux。`);
        setLoading(false);
        return;
      }
      try {
        await uninstallService(() => {});
        setSuccess(true);
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

  if (loading) return <Spinner label="卸载系统服务…" />;
  if (error) return <Text color="red">✖ {error}</Text>;
  if (!success) return null;

  return <Text color="green">✓ icqq 全局系统服务已卸载</Text>;
}

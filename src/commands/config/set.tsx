import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig, saveConfig } from "@/lib/config.js";
import {
  applyConfigSet,
  CONFIG_SET_KEYS,
  isConfigSetKey,
  parseConfigSetValue,
} from "@/lib/config-set.js";

export const description = "设置配置项";

export const args = zod.tuple([
  zod.string().describe(
    argument({
      name: "key",
      description:
        "配置项 (currentUin, webhookUrl, notifyEnabled, mcp.enabled, mcp.http.port, …)",
    }),
  ),
  zod.string().describe(
    argument({
      name: "value",
      description: "配置值",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function ConfigSet({ args: [key, value] }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        if (!isConfigSetKey(key)) {
          throw new Error(
            `未知配置项: ${key}\n可用: ${CONFIG_SET_KEYS.join(", ")}`,
          );
        }

        const parsed = parseConfigSetValue(key, value);
        const config = await loadConfig();
        applyConfigSet(config, key, parsed);
        await saveConfig(config);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [key, value]);

  useEffect(() => {
    if (!loading) {
      if (error) process.exitCode = 1;
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="保存配置…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Text color="green">
      ✔ 已设置 {key} = {value}
      {key.startsWith("mcp.") ? "（执行 icqq service restart 后生效）" : ""}
    </Text>
  );
}

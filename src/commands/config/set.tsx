import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig, saveConfig } from "@/lib/config.js";

export const description = "设置配置项";

export const args = zod.tuple([
  zod.string().describe(
    argument({
      name: "key",
      description: "配置项名称 (defaultUin, webhookUrl, notifyEnabled)",
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

const VALID_KEYS = ["defaultUin", "webhookUrl", "notifyEnabled"] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

function parseValue(key: ConfigKey, raw: string): unknown {
  switch (key) {
    case "defaultUin":
      const n = Number(raw);
      if (Number.isNaN(n) || n <= 0) throw new Error("defaultUin 必须为正整数");
      return n;
    case "notifyEnabled":
      if (raw === "true" || raw === "1") return true;
      if (raw === "false" || raw === "0") return false;
      throw new Error("notifyEnabled 必须为 true/false");
    case "webhookUrl":
      return raw;
  }
}

export default function ConfigSet({ args: [key, value] }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        if (!VALID_KEYS.includes(key as ConfigKey)) {
          throw new Error(
            `未知配置项: ${key}\n可用配置项: ${VALID_KEYS.join(", ")}`,
          );
        }

        const parsed = parseValue(key as ConfigKey, value);
        const config = await loadConfig();
        (config as any)[key] = parsed;
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
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="保存配置…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Text color="green">
      ✔ 已设置 {key} = {value}
    </Text>
  );
}

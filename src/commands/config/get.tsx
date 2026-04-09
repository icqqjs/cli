import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";

export const description = "查看配置项";

export const args = zod.tuple([
  zod.string().optional().describe(
    argument({
      name: "key",
      description: "配置项名称（不指定则显示全部）",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function ConfigGet({ args: [key] }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<[string, string][]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();

        if (key) {
          if (!(key in config)) {
            throw new Error(
              `未知配置项: ${key}\n可用: currentUin, webhookUrl, notifyEnabled, accounts`,
            );
          }
          const val = (config as any)[key];
          const display =
            typeof val === "object" ? JSON.stringify(val, null, 2) : String(val ?? "");
          setOutput([[key, display]]);
        } else {
          const entries: [string, string][] = [
            ["currentUin", String(config.currentUin ?? "(未设置)")],
            ["webhookUrl", config.webhookUrl || "(未设置)"],
            ["notifyEnabled", String(config.notifyEnabled ?? false)],
            [
              "accounts",
              Object.keys(config.accounts).length > 0
                ? Object.keys(config.accounts).join(", ")
                : "(无)",
            ],
          ];
          setOutput(entries);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, [key]);

  useEffect(() => {
    if (!loading) {
      if (error) process.exitCode = 1;
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="读取配置…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Box flexDirection="column" paddingX={1}>
      {output.map(([k, v]) => (
        <Text key={k}>
          <Text color="cyan">{k}</Text>
          <Text>: </Text>
          <Text>{v}</Text>
        </Text>
      ))}
    </Box>
  );
}

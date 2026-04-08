import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { Spinner } from "@/components/Spinner.js";
import { loadConfig } from "@/lib/config.js";
import { isDaemonRunning, getDaemonPid } from "@/daemon/lifecycle.js";
import { IpcClient } from "@/lib/ipc-client.js";
import { Actions } from "@/daemon/protocol.js";

export const description = "查看所有实例状态";

type InstanceInfo = {
  uin: number;
  running: boolean;
  pid: number | null;
  online?: boolean;
  nickname?: string;
  friendCount?: number;
  groupCount?: number;
  isDefault: boolean;
};

export default function Status() {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uins = Object.keys(config.accounts).map(Number).filter((n) => !Number.isNaN(n));

        if (uins.length === 0) {
          setError("无已配置的账号，请先执行 icqq login");
          setLoading(false);
          return;
        }

        const results: InstanceInfo[] = await Promise.all(
          uins.map(async (uin) => {
            const info: InstanceInfo = {
              uin,
              running: false,
              pid: null,
              isDefault: uin === config.defaultUin,
            };

            const running = await isDaemonRunning(uin);
            info.running = running;

            if (running) {
              info.pid = await getDaemonPid(uin);
              try {
                const ipc = await IpcClient.connect(uin);
                const resp = await ipc.request(Actions.GET_STATUS);
                ipc.close();
                if (resp.ok && resp.data) {
                  const d = resp.data as any;
                  info.online = d.online;
                  info.nickname = d.nickname;
                  info.friendCount = d.friendCount;
                  info.groupCount = d.groupCount;
                }
              } catch {
                // IPC failed but daemon pid exists
              }
            }

            return info;
          }),
        );

        // Sort: running first, then by uin
        results.sort((a, b) => {
          if (a.running !== b.running) return a.running ? -1 : 1;
          return a.uin - b.uin;
        });

        setInstances(results);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), error ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, error, exit]);

  if (loading) return <Spinner label="查询所有实例…" />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">实例状态</Text>
      {instances.map((inst) => (
        <Box key={inst.uin} flexDirection="column" marginTop={1}>
          <Text>
            <Text color={inst.running ? "green" : "gray"}>
              {inst.running ? "●" : "○"}
            </Text>
            {" "}
            <Text bold>{inst.uin}</Text>
            {inst.nickname ? <Text dimColor> ({inst.nickname})</Text> : null}
            {inst.isDefault ? <Text color="yellow"> [默认]</Text> : null}
          </Text>
          {inst.running ? (
            <Box paddingLeft={2} flexDirection="column">
              <Text>
                状态:{" "}
                <Text color={inst.online ? "green" : "red"}>
                  {inst.online ? "在线" : "离线"}
                </Text>
                {inst.pid ? <Text dimColor>  PID: {inst.pid}</Text> : null}
              </Text>
              {inst.friendCount !== undefined && (
                <Text dimColor>
                  好友: {inst.friendCount}  群组: {inst.groupCount}
                </Text>
              )}
            </Box>
          ) : (
            <Box paddingLeft={2}>
              <Text dimColor>未运行</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}

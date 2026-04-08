import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import zod from "zod";
import { argument } from "pastel";
import { Spinner } from "../../../components/Spinner.js";
import { ChatSession } from "../../../components/ChatSession.js";
import { GroupSelector } from "../../../components/GroupSelector.js";
import { loadConfig } from "../../../lib/config.js";
import { IpcClient } from "../../../lib/ipc-client.js";
import { isDaemonRunning } from "../../../daemon/lifecycle.js";

export const description = "进入群聊天模式";

export const args = zod.tuple([
  zod.number().optional().describe(
    argument({
      name: "id",
      description: "群号（不填则交互选择）",
    }),
  ),
]);

type Props = {
  args: zod.infer<typeof args>;
};

export default function GroupChat({ args: [id] }: Props) {
  const { exit } = useApp();
  const [ipc, setIpc] = useState<IpcClient | null>(null);
  const [selectedId, setSelectedId] = useState<number | undefined>(id);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const client = await IpcClient.connect(uin);
        setIpc(client);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      ipc?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <Text color="red">✖ {error}</Text>;
  }

  if (!ipc) {
    return <Spinner label="连接守护进程…" />;
  }

  if (selectedId === undefined) {
    return <GroupSelector onSelect={setSelectedId} />;
  }

  return <ChatSession ipc={ipc} type="group" id={selectedId} />;
}

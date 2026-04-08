import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import type { IpcClient } from "../lib/ipc-client.js";
import type { IpcEvent } from "../daemon/protocol.js";
import { Actions } from "../daemon/protocol.js";

type Message = {
  nickname: string;
  content: string;
  time: number;
};

type Props = {
  ipc: IpcClient;
  type: "private" | "group";
  id: number;
};

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("zh-CN", {
    hour12: false,
  });
}

export function ChatSession({ ipc, type, id }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const sub = ipc.subscribe(
      Actions.SUBSCRIBE,
      { type, id },
      (event: IpcEvent) => {
        if (event.event === "message") {
          const data = event.data as any;
          setMessages((prev) => [
            ...prev.slice(-100),
            {
              nickname: data.nickname,
              content: data.raw_message,
              time: data.time,
            },
          ]);
        }
      },
    );

    return () => {
      void sub.unsubscribe();
    };
  }, [ipc, type, id]);

  useInput((char, key) => {
    if (key.return) {
      const text = input.trim();
      if (!text) return;

      void sendMessage(text);
      setInput("");
      return;
    }

    if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    if (char && !key.ctrl && !key.meta) {
      setInput((prev) => prev + char);
    }
  });

  const sendMessage = async (text: string) => {
    setSending(true);
    try {
      const action =
        type === "private"
          ? Actions.SEND_PRIVATE_MSG
          : Actions.SEND_GROUP_MSG;
      const params =
        type === "private"
          ? { uid: id, message: text }
          : { gid: id, message: text };
      await ipc.request(action, params);
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          nickname: "我",
          content: text,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          nickname: "系统",
          content: `发送失败: ${e instanceof Error ? e.message : String(e)}`,
          time: Math.floor(Date.now() / 1000),
        },
      ]);
    }
    setSending(false);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">
        ━━ {type === "group" ? "群聊" : "私聊"} ({id}) ━━
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, i) => (
          <Text key={i}>
            <Text dimColor>[{formatTime(msg.time)}]</Text>{" "}
            <Text bold>{msg.nickname}</Text>: {msg.content}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="green">&gt; </Text>
        <Text>
          {input}
          <Text color="cyan">█</Text>
        </Text>
        {sending && <Text color="yellow"> 发送中…</Text>}
      </Box>
    </Box>
  );
}

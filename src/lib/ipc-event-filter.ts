import type { IpcEvent } from "@/daemon/protocol.js";

/** 判断 IPC 推送是否为指定私聊/群聊会话的消息 */
export function isChatMessageEvent(
  event: IpcEvent,
  type: "private" | "group",
  id: number,
): boolean {
  if (!event.event.startsWith("message")) return false;
  const data = event.data as Record<string, unknown> | null;
  if (!data || data.message_type !== type) return false;

  if (type === "group") {
    return Number(data.group_id) === id;
  }

  const fromId = Number(data.from_id ?? data.user_id);
  return fromId === id;
}

/** 判断 IPC 推送是否为指定频道子频道消息 */
export function isGuildChannelMessageEvent(
  event: IpcEvent,
  channelId: string,
): boolean {
  if (!event.event.startsWith("message.guild")) return false;
  const data = event.data as Record<string, unknown> | null;
  return data != null && String(data.channel_id) === channelId;
}

/** 从 icqq 消息事件 data 提取聊天 UI 展示字段 */
export function chatMessageFromEventData(data: Record<string, unknown>): {
  nickname: string;
  content: string;
  time: number;
} {
  const sender = data.sender as Record<string, unknown> | undefined;
  return {
    nickname: String(
      sender?.card ?? sender?.nickname ?? data.user_id ?? data.from_id ?? "?",
    ),
    content: String(data.raw_message ?? ""),
    time: Number(data.time ?? Math.floor(Date.now() / 1000)),
  };
}

export function guildMessageFromEventData(data: Record<string, unknown>): {
  nickname: string;
  content: string;
  time: number;
} {
  const sender = data.sender as Record<string, unknown> | undefined;
  return {
    nickname: String(sender?.nickname ?? sender?.tiny_id ?? "?"),
    content: String(data.raw_message ?? ""),
    time: Number(data.time ?? Math.floor(Date.now() / 1000)),
  };
}

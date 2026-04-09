import net from "node:net";
import fs from "node:fs/promises";
import type { Client } from "@icqqjs/icqq";
import type { IpcRequest, IpcMessage } from "./protocol.js";
import { Actions } from "./protocol.js";
import { handleRequest } from "./handlers.js";
import { stringifyMessage } from "@/lib/parse-message.js";
import { loadConfig, saveConfig } from "@/lib/config.js";
import { getSocketPath } from "@/lib/paths.js";
import { sendNotification } from "@/lib/notify.js";

type Subscription = {
  type: "group" | "private" | "guild";
  id: number | string;
  reqId: string;
};

/**
 * 守护进程 IPC 服务端。
 *
 * 职责：
 *   - 监听 Unix Domain Socket，接受 CLI 客户端连接
 *   - 对每个连接进行 Token 认证（首条消息必须为 auth）
 *   - 将 IPC 请求分发给 handlers 处理
 *   - 管理消息订阅（SUBSCRIBE/UNSUBSCRIBE）
 *   - 将 QQ 消息转发到已订阅的客户端、Webhook、系统通知
 *
 * 生命周期：
 *   1. new DaemonServer(client, uin, ipcToken)
 *   2. await server.start()   — 创建 Socket 文件并开始监听
 *   3. await server.stop()    — 断开所有连接并关闭服务
 */
export class DaemonServer {
  private server: net.Server;
  private client: Client;
  private uin: number;
  private ipcToken: string;
  private subscriptions = new Map<string, Subscription[]>();
  private sockets = new Map<string, net.Socket>();
  private authedSockets = new Set<string>();
  private nextSocketId = 0;
  private webhookUrl = "";
  private notifyEnabled = false;

  constructor(client: Client, uin: number, ipcToken: string) {
    this.client = client;
    this.uin = uin;
    this.ipcToken = ipcToken;
    this.server = net.createServer((socket) => this.handleConnection(socket));
    this.setupMessageForwarding();
    void this.loadWebhook();
  }

  private async loadWebhook() {
    try {
      const config = await loadConfig();
      this.webhookUrl = config.webhookUrl ?? "";
      this.notifyEnabled = config.notifyEnabled ?? false;
    } catch { /* ignore */ }
  }

  private async pushWebhook(payload: Record<string, unknown>) {
    if (!this.webhookUrl) return;
    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uin: this.uin, ...payload }),
        // Webhook 推送超时 10s，避免阻塞消息流
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.error(`[webhook] POST failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  private setupMessageForwarding() {
    this.client.on("message", (event) => {
      const msgType = event.message_type;
      const groupId = "group_id" in event ? (event.group_id as number) : 0;
      const targetId = msgType === "group" ? groupId : event.user_id;

      const eventData = {
        type: msgType,
        from_id: event.user_id,
        user_id: event.user_id,
        nickname:
          event.sender?.nickname ?? String(event.user_id),
        raw_message: stringifyMessage(event.message),
        time: event.time,
        ...(msgType === "group" ? { group_id: groupId } : {}),
      };

      // Push to webhook
      void this.pushWebhook({ event: "message", data: eventData });

      // Push system notification
      if (this.notifyEnabled) {
        const sender = eventData.nickname;
        const body = eventData.raw_message;
        if (msgType === "group") {
          const groupName =
            this.client.gl.get(targetId)?.group_name ?? String(targetId);
          sendNotification({
            title: groupName,
            subtitle: sender,
            body,
          });
        } else {
          sendNotification({
            title: sender,
            body,
          });
        }
      }

      // Push to IPC subscribers
      for (const [socketId, subs] of this.subscriptions.entries()) {
        for (const sub of subs) {
          if (sub.type === msgType && sub.id === targetId) {
            const socket = this.sockets.get(socketId);
            if (socket && !socket.destroyed) {
              const evt: IpcMessage = {
                id: sub.reqId,
                event: "message",
                data: eventData,
              };
              this.sendToSocket(socket, evt);
            }
          }
        }
      }
    });

    // Guild (channel) message forwarding
    this.client.on("message.guild" as any, (event: any) => {
      const channelId = event.channel_id as string;
      const eventData = {
        type: "guild" as const,
        guild_id: event.guild_id as string,
        guild_name: event.guild_name as string,
        channel_id: channelId,
        channel_name: event.channel_name as string,
        nickname: event.sender?.nickname ?? "",
        tiny_id: event.sender?.tiny_id ?? "",
        raw_message: event.raw_message ?? "",
        time: event.time ?? Math.floor(Date.now() / 1000),
        seq: event.seq,
      };

      void this.pushWebhook({ event: "message", data: eventData });

      for (const [socketId, subs] of this.subscriptions.entries()) {
        for (const sub of subs) {
          if (sub.type === "guild" && sub.id === channelId) {
            const socket = this.sockets.get(socketId);
            if (socket && !socket.destroyed) {
              this.sendToSocket(socket, {
                id: sub.reqId,
                event: "message",
                data: eventData,
              });
            }
          }
        }
      }
    });
  }

  private sendToSocket(socket: net.Socket, msg: IpcMessage) {
    if (!socket.destroyed) {
      socket.write(JSON.stringify(msg) + "\n");
    }
  }

  private handleConnection(socket: net.Socket) {
    const socketId = String(this.nextSocketId++);
    this.sockets.set(socketId, socket);
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line) as IpcRequest;

          // First message must be auth
          if (!this.authedSockets.has(socketId)) {
            if (req.action === "auth" && req.params.token === this.ipcToken) {
              this.authedSockets.add(socketId);
              this.sendToSocket(socket, { id: req.id, ok: true, data: { authed: true } });
            } else {
              this.sendToSocket(socket, { id: req.id, ok: false, error: "认证失败" });
              socket.destroy();
            }
            continue;
          }

          void this.processRequest(socketId, socket, req);
        } catch {
          // ignore malformed JSON
        }
      }
    });

    socket.on("close", () => {
      this.sockets.delete(socketId);
      this.subscriptions.delete(socketId);
      this.authedSockets.delete(socketId);
    });

    socket.on("error", () => {
      this.sockets.delete(socketId);
      this.subscriptions.delete(socketId);
      this.authedSockets.delete(socketId);
    });
  }

  private async processRequest(
    socketId: string,
    socket: net.Socket,
    req: IpcRequest,
  ) {
    if (req.action === Actions.SUBSCRIBE) {
      const type = req.params.type as "group" | "private" | "guild";
      const id = type === "guild" ? String(req.params.id) : Number(req.params.id);
      const subs = this.subscriptions.get(socketId) ?? [];
      subs.push({ type, id, reqId: req.id });
      this.subscriptions.set(socketId, subs);
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { subscribed: true },
      });
      return;
    }

    if (req.action === Actions.UNSUBSCRIBE) {
      const type = req.params.type as "group" | "private" | "guild";
      const id = type === "guild" ? String(req.params.id) : Number(req.params.id);
      const subs = this.subscriptions.get(socketId) ?? [];
      this.subscriptions.set(
        socketId,
        subs.filter((s) => !(s.type === type && s.id === id)),
      );
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { unsubscribed: true },
      });
      return;
    }

    if (req.action === Actions.SET_WEBHOOK) {
      const url = (req.params.url as string) ?? "";
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            this.sendToSocket(socket, {
              id: req.id,
              ok: false,
              error: "Webhook URL 仅支持 http/https 协议",
            });
            return;
          }
        } catch {
          this.sendToSocket(socket, {
            id: req.id,
            ok: false,
            error: "无效的 Webhook URL",
          });
          return;
        }
      }
      this.webhookUrl = url;
      try {
        const config = await loadConfig();
        config.webhookUrl = url || undefined;
        await saveConfig(config);
      } catch { /* ignore */ }
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { webhookUrl: url || null },
      });
      return;
    }

    if (req.action === Actions.GET_WEBHOOK) {
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { webhookUrl: this.webhookUrl || null },
      });
      return;
    }

    if (req.action === Actions.SET_NOTIFY) {
      const enabled = req.params.enabled !== false;
      this.notifyEnabled = enabled;
      try {
        const config = await loadConfig();
        config.notifyEnabled = enabled || undefined;
        await saveConfig(config);
      } catch { /* ignore */ }
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { notifyEnabled: enabled },
      });
      return;
    }

    if (req.action === Actions.GET_NOTIFY) {
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { notifyEnabled: this.notifyEnabled },
      });
      return;
    }

    try {
      const response = await handleRequest(this.client, req);
      this.sendToSocket(socket, response);
    } catch (err) {
      this.sendToSocket(socket, {
        id: req.id,
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async start(): Promise<void> {
    const sockPath = getSocketPath(this.uin);
    try {
      await fs.unlink(sockPath);
    } catch {
      // ignore — file may not exist
    }

    return new Promise((resolve, reject) => {
      this.server.on("error", reject);
      this.server.listen(sockPath, async () => {
        try {
          await fs.chmod(sockPath, 0o600);
        } catch { /* ignore */ }
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets.values()) {
      socket.destroy();
    }
    this.sockets.clear();
    this.subscriptions.clear();
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

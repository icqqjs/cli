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
  type: "group" | "private";
  id: number;
  reqId: string;
};

export class DaemonServer {
  private server: net.Server;
  private client: Client;
  private uin: number;
  private subscriptions = new Map<string, Subscription[]>();
  private sockets = new Map<string, net.Socket>();
  private nextSocketId = 0;
  private webhookUrl = "";
  private notifyEnabled = false;

  constructor(client: Client, uin: number) {
    this.client = client;
    this.uin = uin;
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
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.error(`[webhook] POST failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  private setupMessageForwarding() {
    this.client.on("message", (event) => {
      const msgType = event.message_type;
      const targetId =
        msgType === "group"
          ? (event as any).group_id
          : event.user_id;

      const eventData = {
        type: msgType,
        from_id: event.user_id,
        user_id: event.user_id,
        nickname:
          event.sender?.nickname ?? String(event.user_id),
        raw_message: stringifyMessage(event.message),
        time: event.time,
        ...(msgType === "group"
          ? { group_id: (event as any).group_id }
          : {}),
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
          void this.processRequest(socketId, socket, req);
        } catch {
          // ignore malformed JSON
        }
      }
    });

    socket.on("close", () => {
      this.sockets.delete(socketId);
      this.subscriptions.delete(socketId);
    });

    socket.on("error", () => {
      this.sockets.delete(socketId);
      this.subscriptions.delete(socketId);
    });
  }

  private async processRequest(
    socketId: string,
    socket: net.Socket,
    req: IpcRequest,
  ) {
    if (req.action === Actions.SUBSCRIBE) {
      const type = req.params.type as "group" | "private";
      const id = Number(req.params.id);
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
      const type = req.params.type as "group" | "private";
      const id = Number(req.params.id);
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

    const response = await handleRequest(this.client, req);
    this.sendToSocket(socket, response);
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
      this.server.listen(sockPath, () => resolve());
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

import net from "node:net";
import fs from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Client } from "@icqqjs/icqq";
import type { IpcRequest, IpcMessage } from "./protocol.js";
import { Actions } from "./protocol.js";
import { handleRequest } from "./handlers.js";
import { renderDisplayMessage } from "@/lib/parse-message.js";
import {
  icqqEventJsonReplacer,
  serializeIcqqEvent,
} from "@/lib/serialize-icqq-event.js";
import { loadConfig, saveConfig, type RpcConfig } from "@/lib/config.js";
import { getSocketPath, getRpcPortPath } from "@/lib/paths.js";
import { sendNotification } from "@/lib/notify.js";

type EventSubscription = {
  /** 订阅请求 id，IPC 推送时回填到 IpcEvent.id */
  reqId: string;
};

/** Per-IP auth failure tracker for RPC rate limiting */
type AuthFailure = { count: number; firstAttempt: number };

/** IP rate limiting window: 5 failures within 5 minutes → block */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_FAILURES = 5;

/**
 * 守护进程服务端，同时支持 IPC（Unix Socket）和 RPC（TCP）。
 *
 * 职责：
 *   - 监听 Unix Domain Socket，接受本地 CLI 客户端连接（IPC）
 *   - 可选监听 TCP 端口，接受远程客户端连接（RPC）
 *   - IPC 连接使用 Token 直传认证
 *   - RPC 连接使用 HMAC-SHA256 挑战-响应认证 + IP 限速
 *   - 将 IPC/RPC 请求分发给 handlers 处理
 *   - 管理事件订阅（SUBSCRIBE/UNSUBSCRIBE）
 *   - 将 icqq client 收到的全部事件推送到已订阅的 IPC/RPC 客户端
 *
 * 生命周期：
 *   1. new DaemonServer(client, uin, ipcToken, rpcConfig?)
 *   2. await server.start()   — 创建 Socket + 可选 TCP 并开始监听
 *   3. await server.stop()    — 断开所有连接并关闭服务
 */
export class DaemonServer {
  private ipcServer: net.Server;
  private rpcServer: net.Server | null = null;
  private rpcConfig: RpcConfig | null;
  private rpcPort = 0;
  private client: Client;
  private uin: number;
  private ipcToken: string;
  private subscriptions = new Map<string, EventSubscription[]>();
  private sockets = new Map<string, net.Socket>();
  private authedSockets = new Set<string>();
  /** Pending HMAC challenges keyed by socketId */
  private pendingChallenges = new Map<string, string>();
  /** IP-based auth failure rate limiting */
  private authFailures = new Map<string, AuthFailure>();
  private nextSocketId = 0;
  private webhookUrl = "";
  private notifyEnabled = false;

  constructor(
    client: Client,
    uin: number,
    ipcToken: string,
    rpcConfig?: RpcConfig | null,
  ) {
    this.client = client;
    this.uin = uin;
    this.ipcToken = ipcToken;
    this.rpcConfig = rpcConfig ?? null;
    this.ipcServer = net.createServer((socket) =>
      this.handleConnection(socket, "ipc"),
    );
    this.setupEventForwarding();
    void this.loadWebhook();
  }

  /** 获取 RPC 实际监听端口（port=0 时由系统分配） */
  getRpcPort(): number {
    return this.rpcPort;
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

  /**
   * 拦截 icqq 的 em()，将 client 能收到的每个事件推送给 IPC 订阅方。
   * 仅 hook em（icqq 标准事件分发），避免 emit 冒泡重复推送。
   */
  private setupEventForwarding() {
    const client = this.client as Client & {
      em: (name?: string, data?: unknown) => void;
    };
    const originalEm = client.em.bind(client);

    client.em = (name = "", data?: unknown) => {
      originalEm(name, data);
      if (!name) return;
      this.pushClientEvent(name, data);
    };
  }

  private pushClientEvent(eventName: string, rawData: unknown) {
    const eventData = serializeIcqqEvent(rawData);

    void this.pushWebhook({ event: eventName, data: eventData });

    if (this.notifyEnabled) {
      this.maybeNotifyMessage(eventName, eventData);
    }

    for (const [socketId, subs] of this.subscriptions.entries()) {
      const socket = this.sockets.get(socketId);
      if (!socket || socket.destroyed) continue;
      for (const sub of subs) {
        this.sendToSocket(socket, {
          id: sub.reqId,
          event: eventName,
          data: eventData,
        });
      }
    }
  }

  /** 桌面通知：仅对聊天消息触发（与 entry.ts 中其他通知互补） */
  private maybeNotifyMessage(eventName: string, eventData: unknown) {
    if (!eventName.startsWith("message")) return;
    const data = eventData as Record<string, unknown>;
    const rawMessage = data.raw_message;
    if (typeof rawMessage !== "string" || !rawMessage) return;

    const sender = this.displayNickname(data);
    const body = renderDisplayMessage(rawMessage);
    const msgType = data.message_type;

    if (msgType === "group") {
      const groupId = Number(data.group_id);
      const groupName =
        this.client.gl.get(groupId)?.group_name ?? String(groupId);
      sendNotification({
        title: groupName,
        subtitle: sender,
        body,
      });
      return;
    }

    if (msgType === "private") {
      sendNotification({ title: sender, body });
    }
  }

  private displayNickname(data: Record<string, unknown>): string {
    const sender = data.sender as Record<string, unknown> | undefined;
    return String(
      sender?.card ?? sender?.nickname ?? data.user_id ?? data.from_id ?? "?",
    );
  }

  private sendToSocket(socket: net.Socket, msg: IpcMessage) {
    if (!socket.destroyed) {
      socket.write(JSON.stringify(msg, icqqEventJsonReplacer) + "\n");
    }
  }

  // ── Rate limiting helpers ──

  private isRateLimited(ip: string): boolean {
    const record = this.authFailures.get(ip);
    if (!record) return false;
    if (Date.now() - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      this.authFailures.delete(ip);
      return false;
    }
    return record.count >= RATE_LIMIT_MAX_FAILURES;
  }

  private recordAuthFailure(ip: string): void {
    const now = Date.now();
    const record = this.authFailures.get(ip);
    if (!record || now - record.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      this.authFailures.set(ip, { count: 1, firstAttempt: now });
    } else {
      record.count++;
    }
  }

  private clearAuthFailure(ip: string): void {
    this.authFailures.delete(ip);
  }

  // ── Connection handling ──

  private handleConnection(socket: net.Socket, mode: "ipc" | "rpc") {
    const socketId = String(this.nextSocketId++);
    this.sockets.set(socketId, socket);
    let buffer = "";

    const remoteIp = socket.remoteAddress ?? "unknown";

    // RPC: check rate limit on connect, then send challenge
    if (mode === "rpc") {
      if (this.isRateLimited(remoteIp)) {
        socket.write(
          JSON.stringify({ id: "", ok: false, error: "认证失败次数过多，请稍后重试" }) + "\n",
        );
        socket.destroy();
        this.sockets.delete(socketId);
        return;
      }
      // Send a challenge nonce immediately
      const challenge = randomBytes(32).toString("hex");
      this.pendingChallenges.set(socketId, challenge);
      socket.write(JSON.stringify({ challenge }) + "\n");
    }

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      // Prevent memory exhaustion from un-authenticated huge payloads
      if (!this.authedSockets.has(socketId) && buffer.length > 4096) {
        socket.destroy();
        return;
      }
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line) as IpcRequest;

          // ── Auth gate ──
          if (!this.authedSockets.has(socketId)) {
            if (mode === "ipc") {
              this.handleIpcAuth(socketId, socket, req);
            } else {
              this.handleRpcAuth(socketId, socket, req, remoteIp);
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
      this.pendingChallenges.delete(socketId);
    });

    socket.on("error", () => {
      this.sockets.delete(socketId);
      this.subscriptions.delete(socketId);
      this.authedSockets.delete(socketId);
      this.pendingChallenges.delete(socketId);
    });
  }

  /**
   * IPC (Unix Socket) 认证：直接传 token。
   * 本地 Socket 文件权限 0o600 保证仅当前用户可访问。
   */
  private handleIpcAuth(socketId: string, socket: net.Socket, req: IpcRequest) {
    if (req.action === "auth" && req.params.token === this.ipcToken) {
      this.authedSockets.add(socketId);
      this.sendToSocket(socket, { id: req.id, ok: true, data: { authed: true } });
    } else {
      this.sendToSocket(socket, { id: req.id, ok: false, error: "认证失败" });
      socket.destroy();
    }
  }

  /**
   * RPC (TCP) 认证：HMAC-SHA256 挑战-响应。
   *
   * 流程：
   *   1. 服务端连接后发送 { challenge: "<hex>" }
   *   2. 客户端用 HMAC-SHA256(token, challenge) 生成 digest
   *   3. 客户端发送 { action: "auth", params: { digest: "<hex>" } }
   *   4. 服务端验证 digest，通过则认证成功
   *
   * token 永不经过网络传输，防止中间人嗅探。
   */
  private handleRpcAuth(
    socketId: string,
    socket: net.Socket,
    req: IpcRequest,
    remoteIp: string,
  ) {
    const challenge = this.pendingChallenges.get(socketId);
    if (!challenge) {
      this.sendToSocket(socket, { id: req.id, ok: false, error: "认证流程异常" });
      socket.destroy();
      return;
    }

    if (req.action !== "auth" || typeof req.params.digest !== "string") {
      this.sendToSocket(socket, { id: req.id, ok: false, error: "认证失败" });
      this.recordAuthFailure(remoteIp);
      socket.destroy();
      return;
    }

    const expected = createHmac("sha256", this.ipcToken)
      .update(challenge)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const digestBuf = Buffer.from(req.params.digest as string, "hex");
    const expectedBuf = Buffer.from(expected, "hex");

    if (
      digestBuf.length !== expectedBuf.length ||
      !timingSafeEqual(digestBuf, expectedBuf)
    ) {
      this.recordAuthFailure(remoteIp);
      console.error(`[rpc] 认证失败: ${remoteIp}`);
      this.sendToSocket(socket, { id: req.id, ok: false, error: "认证失败" });
      socket.destroy();
      return;
    }

    this.pendingChallenges.delete(socketId);
    this.clearAuthFailure(remoteIp);
    this.authedSockets.add(socketId);
    this.sendToSocket(socket, { id: req.id, ok: true, data: { authed: true } });
  }

  private async processRequest(
    socketId: string,
    socket: net.Socket,
    req: IpcRequest,
  ) {
    if (req.action === Actions.SUBSCRIBE) {
      const subs = this.subscriptions.get(socketId) ?? [];
      if (!subs.some((s) => s.reqId === req.id)) {
        subs.push({ reqId: req.id });
      }
      this.subscriptions.set(socketId, subs);
      this.sendToSocket(socket, {
        id: req.id,
        ok: true,
        data: { subscribed: true },
      });
      return;
    }

    if (req.action === Actions.UNSUBSCRIBE) {
      const reqId = req.params.reqId as string | undefined;
      const subs = this.subscriptions.get(socketId) ?? [];
      this.subscriptions.set(
        socketId,
        reqId ? subs.filter((s) => s.reqId !== reqId) : [],
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
          // SSRF 防护：拒绝内网/元数据地址
          const hostname = parsed.hostname;
          if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            hostname === "0.0.0.0" ||
            hostname.startsWith("169.254.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("192.168.") ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
          ) {
            this.sendToSocket(socket, {
              id: req.id,
              ok: false,
              error: "不允许使用内网或元数据地址作为 Webhook",
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
    // ── IPC: Unix Domain Socket ──
    const sockPath = getSocketPath(this.uin);
    try {
      await fs.unlink(sockPath);
    } catch {
      // ignore — file may not exist
    }

    await new Promise<void>((resolve, reject) => {
      this.ipcServer.on("error", reject);
      this.ipcServer.listen(sockPath, async () => {
        try {
          await fs.chmod(sockPath, 0o600);
        } catch { /* ignore */ }
        resolve();
      });
    });

    // ── RPC: TCP ──
    if (this.rpcConfig?.enabled) {
      this.rpcServer = net.createServer((socket) =>
        this.handleConnection(socket, "rpc"),
      );

      const { host, port } = this.rpcConfig;

      await new Promise<void>((resolve, reject) => {
        this.rpcServer!.on("error", (err) => {
          console.error(`[rpc] TCP 服务启动失败: ${err.message}`);
          reject(err);
        });
        this.rpcServer!.listen(port, host, () => {
          const addr = this.rpcServer!.address() as net.AddressInfo;
          this.rpcPort = addr.port;
          console.log(`[rpc] TCP 服务已启动: ${host}:${this.rpcPort}`);
          resolve();
        });
      });

      // Write port file so clients can discover it
      await fs.writeFile(
        getRpcPortPath(this.uin),
        JSON.stringify({ host: this.rpcConfig.host, port: this.rpcPort }),
        { mode: 0o600 },
      );
    }
  }

  async stop(): Promise<void> {
    for (const socket of this.sockets.values()) {
      socket.destroy();
    }
    this.sockets.clear();
    this.subscriptions.clear();
    this.pendingChallenges.clear();
    this.authFailures.clear();

    const closeServer = (server: net.Server) =>
      new Promise<void>((resolve) => server.close(() => resolve()));

    await closeServer(this.ipcServer);
    if (this.rpcServer) {
      await closeServer(this.rpcServer);
    }

    try {
      await fs.unlink(getRpcPortPath(this.uin));
    } catch { /* ignore */ }
  }
}

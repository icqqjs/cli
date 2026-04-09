/**
 * IPC 客户端 — CLI 侧用于与守护进程通信的客户端。
 *
 * 使用方式：
 *   const client = await IpcClient.connect(uin);
 *   const resp = await client.request(Actions.LIST_FRIENDS);
 *   client.close();
 *
 * 通信协议：JSON + 换行符，基于 Unix Domain Socket。
 * 连接时自动完成 Token 认证。请求超时默认 30 秒。
 *
 * @module ipc-client
 */
import net from "node:net";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getSocketPath, getTokenPath } from "./paths.js";
import type {
  IpcRequest,
  IpcResponse,
  IpcEvent,
  IpcMessage,
} from "@/daemon/protocol.js";

export class IpcClient {
  private socket: net.Socket;
  private buffer = "";
  private pending = new Map<
    string,
    { resolve: (v: IpcResponse) => void; reject: (e: Error) => void }
  >();
  private eventHandlers = new Map<string, (event: IpcEvent) => void>();

  private constructor(socket: net.Socket) {
    this.socket = socket;
    this.socket.on("data", (chunk) => this.onData(chunk.toString()));
    this.socket.on("error", (err) => {
      for (const { reject } of this.pending.values()) {
        reject(err);
      }
      this.pending.clear();
    });
  }

  /**
   * 连接守护进程并完成认证。
   * @param uin - 目标账号的 QQ 号
   * @returns 已认证的 IpcClient 实例
   * @throws 守护进程未运行或认证失败时抛出错误
   */
  static async connect(uin: number): Promise<IpcClient> {
    // Read auth token
    let token: string;
    try {
      token = (await readFile(getTokenPath(uin), "utf-8")).trim();
    } catch {
      throw new Error("无法读取认证 token，守护进程可能未运行");
    }

    const client = await new Promise<IpcClient>((resolve, reject) => {
      const sock = net.connect(getSocketPath(uin));
      sock.on("connect", () => resolve(new IpcClient(sock)));
      sock.on("error", reject);
    });

    // Authenticate
    const authResp = await client.request("auth", { token });
    if (!authResp.ok) {
      client.close();
      throw new Error("IPC 认证失败");
    }
    return client;
  }

  private onData(data: string) {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line) as IpcMessage;
        if ("event" in msg) {
          const handler = this.eventHandlers.get(msg.id);
          handler?.(msg as IpcEvent);
        } else {
          const p = this.pending.get(msg.id);
          if (p) {
            this.pending.delete(msg.id);
            p.resolve(msg as IpcResponse);
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }
  }

  /**
   * 发送 IPC 请求并等待响应。
   * @param action - 操作名称，见 {@link Actions}
   * @param params - 操作参数
   * @param timeoutMs - 超时时间（毫秒），默认 30000
   * @returns IPC 响应
   * @throws 超时或网络错误
   */
  async request(
    action: string,
    params: Record<string, unknown> = {},
    timeoutMs = 30000,
  ): Promise<IpcResponse> {
    const id = randomUUID();
    const req: IpcRequest = { id, action, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`IPC 请求超时 (${timeoutMs}ms): ${action}`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.socket.write(JSON.stringify(req) + "\n", (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * 订阅消息推送（用于实时聊天）。
   * @param action - 通常为 Actions.SUBSCRIBE
   * @param params - { type: "group"|"private", id: number }
   * @param onEvent - 收到推送消息时的回调
   * @returns 订阅句柄，包含 unsubscribe() 方法
   */
  subscribe(
    action: string,
    params: Record<string, unknown>,
    onEvent: (event: IpcEvent) => void,
  ): { id: string; unsubscribe: () => Promise<void> } {
    const id = randomUUID();
    this.eventHandlers.set(id, onEvent);
    const req: IpcRequest = { id, action, params };
    this.socket.write(JSON.stringify(req) + "\n");

    return {
      id,
      unsubscribe: async () => {
        this.eventHandlers.delete(id);
        const unsub: IpcRequest = {
          id: randomUUID(),
          action: "unsubscribe",
          params,
        };
        this.socket.write(JSON.stringify(unsub) + "\n");
      },
    };
  }

  /** 关闭连接，拒绝所有未完成的请求，释放事件处理器。 */
  close() {
    this.eventHandlers.clear();
    for (const { reject } of this.pending.values()) {
      reject(new Error("连接已关闭"));
    }
    this.pending.clear();
    this.socket.destroy();
  }
}

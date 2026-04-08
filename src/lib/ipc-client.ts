import net from "node:net";
import { randomUUID } from "node:crypto";
import { getSocketPath } from "./paths.js";
import type {
  IpcRequest,
  IpcResponse,
  IpcEvent,
  IpcMessage,
} from "../daemon/protocol.js";

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

  static connect(uin: number): Promise<IpcClient> {
    return new Promise((resolve, reject) => {
      const sock = net.connect(getSocketPath(uin));
      sock.on("connect", () => resolve(new IpcClient(sock)));
      sock.on("error", reject);
    });
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

  async request(
    action: string,
    params: Record<string, unknown> = {},
  ): Promise<IpcResponse> {
    const id = randomUUID();
    const req: IpcRequest = { id, action, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.write(JSON.stringify(req) + "\n", (err) => {
        if (err) {
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

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

  close() {
    this.eventHandlers.clear();
    for (const { reject } of this.pending.values()) {
      reject(new Error("连接已关闭"));
    }
    this.pending.clear();
    this.socket.destroy();
  }
}

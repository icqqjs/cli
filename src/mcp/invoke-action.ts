/**
 * MCP / 进程内 IPC 调用：校验 action 并转发至 handleRequest。
 */
import { randomUUID } from "node:crypto";
import type { Client } from "@icqqjs/icqq";
import {
  ACTION_VALUES,
  MCP_BLOCKED_ACTIONS,
} from "@/daemon/action-meta.js";
import { handleRequest } from "@/daemon/handlers.js";
import type { IpcResponse } from "@/daemon/protocol.js";

const ACTION_SET = new Set<string>(ACTION_VALUES);

export type InvokeActionResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function validateAction(action: string): string | null {
  if (!action || typeof action !== "string") {
    return "缺少参数 action";
  }
  if (MCP_BLOCKED_ACTIONS.has(action)) {
    return `禁止通过 MCP 调用: ${action}`;
  }
  if (!ACTION_SET.has(action)) {
    return `未知 action: ${action}，请使用 icqq_list_actions 查看可用列表`;
  }
  return null;
}

export async function invokeAction(
  client: Client,
  action: string,
  params: Record<string, unknown> = {},
): Promise<InvokeActionResult> {
  const err = validateAction(action);
  if (err) return { ok: false, error: err };

  const resp: IpcResponse = await handleRequest(client, {
    id: randomUUID(),
    action,
    params: params ?? {},
  });

  if (!resp.ok) {
    return { ok: false, error: resp.error ?? "请求失败" };
  }
  return { ok: true, data: resp.data };
}

import type { Client } from "@icqqjs/icqq";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { ACTION_META } from "@/daemon/action-meta.js";
import { invokeAction } from "./invoke-action.js";
import { loadMcpPlugins } from "./plugins/load.js";
import type { ResolvedMcpConfig } from "@/lib/config.js";

const INSTRUCTIONS = `通过 icqq_invoke 调用 QQ 操作。action 必须为协议中定义的值；params 与 IPC 一致。
常用：send_private_msg (user_id, message)、send_group_msg (group_id, message)、list_friends、get_self_profile。
消息支持 CQ 码：[face:id] [image:path] [at:uid] [at:all]。
先确保账号已登录（icqq login）；改 mcp 配置后执行 icqq service restart。
不确定 action 时先调用 icqq_list_actions。`;

export async function createMcpServer(
  client: Client,
  uin: number,
  config: ResolvedMcpConfig,
): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "icqq",
      version: "1.0.0",
    },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "icqq_invoke",
    {
      title: "调用 QQ IPC 操作",
      description:
        "执行单个 IPC action（如 send_private_msg、list_friends）。params 为 JSON 对象。",
      inputSchema: {
        action: z.string().describe("IPC action 名称"),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("操作参数，默认 {}"),
      },
    },
    async ({ action, params }) => {
      const result = await invokeAction(client, action, params ?? {});
      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: result.error }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "icqq_list_actions",
    {
      title: "列出可用 IPC actions",
      description: "返回所有可传给 icqq_invoke 的 action 及说明",
      inputSchema: {},
    },
    async () => {
      const list = Object.entries(ACTION_META).map(([action, meta]) => ({
        action,
        ...meta,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(list, null, 2),
          },
        ],
      };
    },
  );

  await loadMcpPlugins(server, client, uin, config.plugins);

  return server;
}

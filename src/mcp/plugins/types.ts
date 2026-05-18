import type { Client } from "@icqqjs/icqq";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { InvokeActionResult } from "../invoke-action.js";

export type IcqqMcpPluginContext = {
  server: McpServer;
  client: Client;
  uin: number;
  invokeAction: (
    action: string,
    params?: Record<string, unknown>,
  ) => Promise<InvokeActionResult>;
};

export type IcqqMcpPlugin = {
  name: string;
  register: (ctx: IcqqMcpPluginContext) => void | Promise<void>;
};

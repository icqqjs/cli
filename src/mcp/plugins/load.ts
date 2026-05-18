import type { Client } from "@icqqjs/icqq";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { invokeAction } from "../invoke-action.js";
import type { IcqqMcpPlugin } from "./types.js";

function extractPlugin(mod: Record<string, unknown>): IcqqMcpPlugin | null {
  const candidate =
    mod.icqqMcpPlugin ??
    mod.default ??
    null;
  if (
    candidate &&
    typeof candidate === "object" &&
    "name" in candidate &&
    "register" in candidate &&
    typeof (candidate as IcqqMcpPlugin).register === "function"
  ) {
    return candidate as IcqqMcpPlugin;
  }
  return null;
}

export async function loadMcpPlugins(
  server: McpServer,
  client: Client,
  uin: number,
  plugins: string[] | undefined,
): Promise<void> {
  if (!plugins?.length) return;

  const ctx = {
    server,
    client,
    uin,
    invokeAction: (action: string, params?: Record<string, unknown>) =>
      invokeAction(client, action, params),
  };

  for (const spec of plugins) {
    try {
      const mod = (await import(spec)) as Record<string, unknown>;
      const plugin = extractPlugin(mod);
      if (!plugin) {
        console.error(`[mcp] 插件 ${spec} 未导出 icqqMcpPlugin 或 default`);
        continue;
      }
      await plugin.register(ctx);
      console.log(`[mcp] 已加载插件: ${plugin.name} (${spec})`);
    } catch (e) {
      console.error(
        `[mcp] 加载插件失败 ${spec}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
}

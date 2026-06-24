/**
 * config set 键解析与赋值。
 */
import type { AccountConfig, IcqqConfig } from "./config.js";

const TOP_LEVEL_KEYS = ["currentUin", "webhookUrl", "notifyEnabled"] as const;

const NESTED_KEYS = [
  "mcp.enabled",
  "mcp.http.host",
  "mcp.http.port",
  "mcp.http.token",
  "rpc.enabled",
  "rpc.host",
  "rpc.port",
] as const;

export const CONFIG_SET_KEYS = [...TOP_LEVEL_KEYS, ...NESTED_KEYS] as const;

export type ConfigSetKey = (typeof CONFIG_SET_KEYS)[number];

export const ACCOUNT_SCOPED_CONFIG_KEYS = NESTED_KEYS;

function parseBool(raw: string): boolean {
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error("布尔值必须为 true/false 或 1/0");
}

function parsePort(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error("端口必须为 0–65535 的整数");
  }
  return n;
}

export function isAccountScopedConfigKey(key: ConfigSetKey): boolean {
  return (ACCOUNT_SCOPED_CONFIG_KEYS as readonly string[]).includes(key);
}

export function parseConfigSetValue(key: ConfigSetKey, raw: string): unknown {
  switch (key) {
    case "currentUin": {
      const n = Number(raw);
      if (Number.isNaN(n) || n <= 0) throw new Error("currentUin 必须为正整数");
      return n;
    }
    case "notifyEnabled":
    case "mcp.enabled":
    case "rpc.enabled":
      return parseBool(raw);
    case "mcp.http.port":
    case "rpc.port":
      return parsePort(raw);
    case "webhookUrl":
    case "mcp.http.host":
    case "mcp.http.token":
    case "rpc.host":
      return raw;
    default:
      return raw;
  }
}

export function isConfigSetKey(key: string): key is ConfigSetKey {
  return (CONFIG_SET_KEYS as readonly string[]).includes(key);
}

function ensureAccountEntry(config: IcqqConfig, uin: number): AccountConfig {
  const key = String(uin);
  const existing = config.accounts[key];
  if (existing) return existing;
  const shell: AccountConfig = { platform: 0, signApiUrl: "" };
  config.accounts[key] = shell;
  return shell;
}

function applyMcpRpcToScope(
  scope: {
    mcp?: IcqqConfig["mcp"];
    rpc?: IcqqConfig["rpc"];
  },
  key: ConfigSetKey,
  value: unknown,
): void {
  switch (key) {
    case "mcp.enabled":
      scope.mcp ??= {};
      scope.mcp.enabled = value as boolean;
      return;
    case "mcp.http.host":
      scope.mcp ??= {};
      scope.mcp.http ??= { host: "127.0.0.1", port: 0 };
      scope.mcp.http.host = value as string;
      return;
    case "mcp.http.port":
      scope.mcp ??= {};
      scope.mcp.http ??= { host: "127.0.0.1", port: 0 };
      scope.mcp.http.port = value as number;
      return;
    case "mcp.http.token":
      scope.mcp ??= {};
      scope.mcp.http ??= { host: "127.0.0.1", port: 0 };
      scope.mcp.http.token = value as string;
      return;
    case "rpc.enabled":
      scope.rpc ??= {};
      scope.rpc.enabled = value as boolean;
      return;
    case "rpc.host":
      scope.rpc ??= {};
      scope.rpc.host = value as string;
      return;
    case "rpc.port":
      scope.rpc ??= {};
      scope.rpc.port = value as number;
      return;
    default:
      return;
  }
}

/**
 * 写入配置。指定 uin 时 mcp/rpc 写入账号覆盖，其余键仍写全局。
 */
export function applyConfigSet(
  config: IcqqConfig,
  key: ConfigSetKey,
  value: unknown,
  uin?: number,
): void {
  if (uin !== undefined && isAccountScopedConfigKey(key)) {
    const account = ensureAccountEntry(config, uin);
    applyMcpRpcToScope(account, key, value);
    return;
  }

  if (uin !== undefined && !isAccountScopedConfigKey(key)) {
    throw new Error(`${key} 为全局配置，请去掉 -u 再设置`);
  }

  switch (key) {
    case "currentUin":
      config.currentUin = value as number;
      return;
    case "webhookUrl":
      config.webhookUrl = value as string;
      return;
    case "notifyEnabled":
      config.notifyEnabled = value as boolean;
      return;
    default:
      applyMcpRpcToScope(config, key, value);
  }
}

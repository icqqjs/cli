/**
 * 配置管理模块。
 *
 * 配置文件位于 ~/.icqq/config.json，权限 0o600。
 * 存储全局设置（当前 UIN、Webhook）和各账号的独立配置。
 *
 * @module config
 */
import fs from "node:fs/promises";
import { getConfigPath, getIcqqHome } from "./paths.js";

/** 单个账号的配置 */
export interface AccountConfig {
  platform: number;
  signApiUrl: string;
  ver?: string;
  logLevel?: string;
}

/** 全局配置结构（~/.icqq/config.json） */
export interface IcqqConfig {
  /** 当前操作的默认账号（可被 -u 或 ICQQ_CURRENT_UIN 覆盖） */
  currentUin?: number;
  /** Webhook 推送地址（仅支持 http/https） */
  webhookUrl?: string;
  /** 是否启用系统桌面通知 */
  notifyEnabled?: boolean;
  /** 各账号配置，key 为 QQ 号字符串 */
  accounts: Record<string, AccountConfig>;
}

/** 读取配置文件，不存在时返回默认值。自动执行 defaultUin → currentUin 向后兼容迁移。 */
export async function loadConfig(): Promise<IcqqConfig> {
  try {
    const data = await fs.readFile(getConfigPath(), "utf-8");
    const raw = JSON.parse(data) as IcqqConfig & { defaultUin?: number };
    // Backward compat: migrate defaultUin → currentUin
    if (raw.defaultUin && !raw.currentUin) {
      raw.currentUin = raw.defaultUin;
    }
    delete raw.defaultUin;
    return raw;
  } catch {
    return { accounts: {} };
  }
}

/** 保存配置文件到 ~/.icqq/config.json（权限 0o600，目录 0o700）。 */
export async function saveConfig(config: IcqqConfig): Promise<void> {
  await fs.mkdir(getIcqqHome(), { recursive: true, mode: 0o700 });
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

export function getAccountConfig(
  config: IcqqConfig,
  uin: number,
): AccountConfig | undefined {
  return config.accounts[String(uin)];
}

export function setAccountConfig(
  config: IcqqConfig,
  uin: number,
  account: AccountConfig,
): void {
  config.accounts[String(uin)] = account;
}

/**
 * Resolve the target uin from (in priority order):
 *   ICQQ_CURRENT_UIN env  →  config.currentUin
 * Throws if nothing is found.
 */
export async function resolveUin(): Promise<number> {
  const envUin = process.env.ICQQ_CURRENT_UIN;
  if (envUin) {
    const n = Number(envUin);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const config = await loadConfig();
  if (config.currentUin) return config.currentUin;
  throw new Error("未找到已登录账号，请先执行 icqq login");
}

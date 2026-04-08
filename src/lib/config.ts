import fs from "node:fs/promises";
import { getConfigPath, getIcqqHome } from "./paths.js";

export interface AccountConfig {
  platform: number;
  signApiUrl: string;
  ver?: string;
  logLevel?: string;
}

export interface IcqqConfig {
  defaultUin?: number;
  webhookUrl?: string;
  accounts: Record<string, AccountConfig>;
}

export async function loadConfig(): Promise<IcqqConfig> {
  try {
    const data = await fs.readFile(getConfigPath(), "utf-8");
    return JSON.parse(data) as IcqqConfig;
  } catch {
    return { accounts: {} };
  }
}

export async function saveConfig(config: IcqqConfig): Promise<void> {
  await fs.mkdir(getIcqqHome(), { recursive: true });
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2) + "\n");
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

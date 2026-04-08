import { createClient as icqqCreateClient, type Client, type Platform } from "@icqqjs/icqq";
import { getAccountDir } from "./paths.js";
import type { AccountConfig } from "./config.js";

export function createIcqqClient(
  uin: number,
  account: AccountConfig,
): Client {
  return icqqCreateClient({
    platform: account.platform as Platform,
    sign_api_addr: account.signApiUrl || undefined,
    ver: account.ver || undefined,
    data_dir: getAccountDir(uin),
    log_level: (account.logLevel ?? "warn") as any,
  });
}

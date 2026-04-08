import fs from "node:fs/promises";
import { createIcqqClient } from "../lib/client.js";
import { loadConfig, getAccountConfig } from "../lib/config.js";
import { getAccountDir, getPidPath, getSocketPath } from "../lib/paths.js";
import { sendNotification } from "../lib/notify.js";
import { DaemonServer } from "./server.js";

async function main() {
  const uin = Number(process.argv[2]);
  if (!uin || Number.isNaN(uin)) {
    console.error("Usage: node entry.js <uin>");
    process.exit(1);
  }

  const config = await loadConfig();
  const account = getAccountConfig(config, uin);
  if (!account) {
    console.error(`[daemon] 未找到账号 ${uin} 的配置`);
    process.exit(1);
  }

  await fs.mkdir(getAccountDir(uin), { recursive: true });
  await fs.writeFile(getPidPath(uin), String(process.pid));

  const client = createIcqqClient(uin, account);

  // Login with cached token
  await new Promise<void>((resolve, reject) => {
    client.once("system.online", resolve);

    client.once("system.login.error", (e) => {
      reject(new Error(e.message));
    });

    // If interactive verification is required, daemon cannot handle it
    client.once("system.login.qrcode", () => {
      reject(new Error("Token 过期，需要扫码。请重新执行 icqq login"));
    });
    client.once("system.login.slider", () => {
      reject(new Error("需要滑块验证。请重新执行 icqq login"));
    });
    client.once("system.login.device", () => {
      reject(new Error("需要设备验证。请重新执行 icqq login"));
    });

    client.login(uin).catch(reject);
  });

  // Start IPC server
  const server = new DaemonServer(client, uin);
  await server.start();
  console.log(
    `[daemon] 账号 ${uin} 已上线, socket: ${getSocketPath(uin)}`,
  );

  // Notify parent process
  if (process.send) {
    process.send("ready");
    if (process.connected) process.disconnect?.();
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[daemon] 收到 ${signal}，正在关闭…`);
    await server.stop();
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    client.terminate();
    try {
      await fs.unlink(getPidPath(uin));
    } catch {
      /* ignore */
    }
    try {
      await fs.unlink(getSocketPath(uin));
    } catch {
      /* ignore */
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // Offline events
  client.on("system.offline.network", (e) => {
    console.log("[daemon] 网络掉线:", e.message);
    if (config.notifyEnabled) {
      sendNotification({ title: "icqq", body: `网络掉线: ${e.message}` });
    }
  });
  client.on("system.offline.kickoff", (e) => {
    console.log("[daemon] 被踢下线:", e.message);
    if (config.notifyEnabled) {
      sendNotification({ title: "icqq", body: `被踢下线: ${e.message}` });
    }
  });

  // Friend & group request notifications
  client.on("request.friend.add", (e) => {
    if (config.notifyEnabled) {
      sendNotification({
        title: "icqq · 好友请求",
        body: `${e.nickname}(${e.user_id}) 请求添加好友${e.comment ? `: ${e.comment}` : ""}`,
      });
    }
  });
  client.on("request.group.invite", (e) => {
    if (config.notifyEnabled) {
      sendNotification({
        title: "icqq · 群邀请",
        body: `${e.nickname ?? e.user_id} 邀请你加入群 ${e.group_name ?? e.group_id}`,
      });
    }
  });
  client.on("request.group.add", (e) => {
    if (config.notifyEnabled) {
      sendNotification({
        title: "icqq · 入群申请",
        body: `${e.nickname ?? e.user_id} 申请加入群 ${e.group_name ?? e.group_id}${e.comment ? `: ${e.comment}` : ""}`,
      });
    }
  });
}

main().catch((e) => {
  console.error("[daemon] 致命错误:", e);
  process.exit(1);
});

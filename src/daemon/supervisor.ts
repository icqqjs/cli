/**
 * 全局 icqq 系统服务入口：按 config.accounts 拉起并看护各账号守护进程。
 *
 * 由 launchd/systemd 以单例运行，不接收 uin 参数。
 */
import { fork, type ChildProcess } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@/lib/config.js";
import {
  getSupervisorPidPath,
  getLogPath,
} from "@/lib/paths.js";
import { isDaemonRunning, stopDaemon } from "./lifecycle.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLL_MS = 30_000;
const tracked = new Map<number, ChildProcess>();

function log(msg: string) {
  console.log(`[supervisor] ${msg}`);
}

async function getConfiguredUins(): Promise<number[]> {
  const config = await loadConfig();
  return Object.keys(config.accounts)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0)
    .sort((a, b) => a - b);
}

async function spawnAccountDaemon(uin: number): Promise<void> {
  if (await isDaemonRunning(uin)) return;

  const entryPath = path.resolve(__dirname, "entry.js");
  const logPath = getLogPath(uin);

  let logFd: number;
  try {
    await fs.mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 });
    logFd = openSync(logPath, "a");
  } catch (e) {
    throw new Error(
      `无法打开日志 ${logPath}: ${e instanceof Error ? e.message : e}`,
    );
  }

  return new Promise<void>((resolve, reject) => {
    const child = fork(entryPath, [String(uin)], {
      detached: true,
      stdio: ["ignore", logFd, logFd, "ipc"],
    });

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`账号 ${uin} 守护进程启动超时`));
    }, 60_000);

    const cleanup = () => {
      clearTimeout(timeout);
      child.removeAllListeners();
      try {
        closeSync(logFd);
      } catch {
        /* ignore */
      }
    };

    child.on("message", (msg) => {
      if (msg === "ready") {
        cleanup();
        child.unref();
        tracked.delete(uin);
        log(`账号 ${uin} 守护进程已就绪`);
        resolve();
      }
    });

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    child.on("exit", (code) => {
      tracked.delete(uin);
      cleanup();
      if (code !== 0) {
        reject(new Error(`账号 ${uin} 守护进程退出 code=${code}`));
      }
    });

    tracked.set(uin, child);
    log(`正在启动账号 ${uin} 守护进程…`);
  });
}

async function reconcileAll(): Promise<void> {
  const uins = await getConfiguredUins();
  if (uins.length === 0) {
    log("未配置任何账号，跳过拉起");
    return;
  }
  for (const uin of uins) {
    try {
      await spawnAccountDaemon(uin);
    } catch (e) {
      log(
        `账号 ${uin} 启动失败: ${e instanceof Error ? e.message : e}`,
      );
    }
  }
}

async function shutdownAll(): Promise<void> {
  const uins = await getConfiguredUins();
  for (const uin of uins) {
    try {
      if (await stopDaemon(uin)) {
        log(`已停止账号 ${uin} 守护进程`);
      }
    } catch {
      /* ignore */
    }
  }
  for (const child of tracked.values()) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  tracked.clear();
}

async function main() {
  await fs.mkdir(path.dirname(getSupervisorPidPath()), { recursive: true, mode: 0o700 });
  await fs.writeFile(getSupervisorPidPath(), String(process.pid), { mode: 0o600 });

  log(`已启动 (PID ${process.pid})`);
  await reconcileAll();

  const timer = setInterval(() => {
    void reconcileAll();
  }, POLL_MS);

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`收到 ${signal}，正在关闭…`);
    clearInterval(timer);
    await shutdownAll();
    try {
      await fs.unlink(getSupervisorPidPath());
    } catch {
      /* ignore */
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((e) => {
  console.error("[supervisor] 致命错误:", e);
  process.exit(1);
});

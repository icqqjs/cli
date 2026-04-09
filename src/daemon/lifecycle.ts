/**
 * 守护进程生命周期管理：启动、停止、状态检测。
 *
 * 守护进程以 fork 方式在后台运行，通过 IPC message "ready" 通知父进程启动完成。
 * 统一存储于 ~/.icqq/<uin>/ 目录：daemon.pid、daemon.sock、daemon.log、daemon.token
 *
 * @module lifecycle
 */
import { fork } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAccountDir,
  getLogPath,
  getPidPath,
  getSocketPath,
} from "@/lib/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function isDaemonRunning(uin: number): Promise<boolean> {
  try {
    const pidStr = await fs.readFile(getPidPath(uin), "utf-8");
    const pid = Number(pidStr.trim());
    if (Number.isNaN(pid)) return false;
    process.kill(pid, 0);
    return await checkSocket(uin);
  } catch {
    return false;
  }
}

function checkSocket(uin: number): Promise<boolean> {
  return new Promise((resolve) => {
    const sockPath = getSocketPath(uin);
    const sock = net.connect(sockPath);
    // Socket 连接超时 2s，仅用于探测守护进程是否存活
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 2000);
    sock.on("connect", () => {
      clearTimeout(timer);
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

export async function getDaemonPid(uin: number): Promise<number | null> {
  try {
    const pidStr = await fs.readFile(getPidPath(uin), "utf-8");
    const pid = Number(pidStr.trim());
    if (Number.isNaN(pid)) return null;
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

export async function spawnDaemon(uin: number): Promise<void> {
  await fs.mkdir(getAccountDir(uin), { recursive: true, mode: 0o700 });

  const logPath = getLogPath(uin);

  // Log rotation: if log exceeds 5MB, rotate to .log.old
  // 5MB 阈值适用于多数场景，约等于 2–3 天强度使用的日志量
  try {
    const stat = await fs.stat(logPath);
    if (stat.size > 5 * 1024 * 1024) {
      await fs.rename(logPath, logPath + ".old");
    }
  } catch { /* ignore — file may not exist */ }

  const logFd = openSync(logPath, "a");
  const entryPath = path.resolve(__dirname, "entry.js");

  return new Promise<void>((resolve, reject) => {
    const child = fork(entryPath, [String(uin)], {
      detached: true,
      stdio: ["ignore", logFd, logFd, "ipc"],
    });

    // 30s 等待守护进程启动（包括 QQ 登录、数据加载、Socket 绑定）
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`守护进程启动超时。查看日志: ${logPath}`));
    }, 30000);

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
        resolve();
      }
    });

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    child.on("exit", (code) => {
      cleanup();
      if (code !== 0) {
        reject(
          new Error(
            `守护进程退出 (code=${code})。查看日志: ${logPath}`,
          ),
        );
      }
    });
  });
}

export async function stopDaemon(uin: number): Promise<boolean> {
  const pid = await getDaemonPid(uin);
  if (pid === null) return false;

  try {
    process.kill(pid, "SIGTERM");
    // 等待 1.5s 让守护进程完成清理（断开连接、删除 pid/token 文件）
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
    return true;
  } catch {
    return false;
  }
}

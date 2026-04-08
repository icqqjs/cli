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
} from "../lib/paths.js";

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
  await fs.mkdir(getAccountDir(uin), { recursive: true });

  const logPath = getLogPath(uin);
  const logFd = openSync(logPath, "a");
  const entryPath = path.resolve(__dirname, "entry.js");

  return new Promise<void>((resolve, reject) => {
    const child = fork(entryPath, [String(uin)], {
      detached: true,
      stdio: ["ignore", logFd, logFd, "ipc"],
    });

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
    // Wait for cleanup
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

import path from "node:path";
import os from "node:os";

export function getIcqqHome(): string {
  return path.join(os.homedir(), ".icqq");
}

export function getAccountDir(uin: number): string {
  return path.join(getIcqqHome(), String(uin));
}

export function getTmpDir(): string {
  return path.join(getIcqqHome(), ".tmp");
}

export function getSocketPath(uin: number): string {
  return path.join(getAccountDir(uin), "daemon.sock");
}

export function getPidPath(uin: number): string {
  return path.join(getAccountDir(uin), "daemon.pid");
}

export function getLogPath(uin: number): string {
  return path.join(getAccountDir(uin), "daemon.log");
}

export function getConfigPath(): string {
  return path.join(getIcqqHome(), "config.json");
}

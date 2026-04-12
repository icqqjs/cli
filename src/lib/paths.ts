/**
 * 路径常量工具。
 *
 * 所有数据存放于 ~/.icqq/ 目录下，结构如下：
 *
 *   ~/.icqq/
 *     config.json          全局配置（0o600）
 *     .tmp/                临时文件目录
 *     <uin>/               各账号独立目录（0o700）
 *       daemon.pid         守护进程 PID
 *       daemon.sock        Unix Domain Socket
 *       daemon.log         守护进程日志（>5MB 自动轮转为 .log.old）
 *       daemon.token       IPC 认证 Token（0o600）
 *       device.json        设备信息
 *       token              QQ 登录 token
 *
 * @module paths
 */
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

export function getTokenPath(uin: number): string {
  return path.join(getAccountDir(uin), "daemon.token");
}

export function getRpcPortPath(uin: number): string {
  return path.join(getAccountDir(uin), "daemon.rpc");
}

export function getConfigPath(): string {
  return path.join(getIcqqHome(), "config.json");
}

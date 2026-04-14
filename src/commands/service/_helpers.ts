/**
 * service 命令共享工具：路径计算、plist/unit 生成、service 操作、多账号解析。
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig, resolveUin } from "@/lib/config.js";
import { getLogPath } from "@/lib/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── path helpers ─────────────────────────────────────────────────────────────

export function getLaunchdLabel(uin: number) {
  return `com.icqq.daemon.${uin}`;
}

export function getLaunchdPlistPath(uin: number) {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${getLaunchdLabel(uin)}.plist`);
}

export function getSystemdServiceName(uin: number) {
  return `icqq-${uin}.service`;
}

export function getSystemdServicePath(uin: number) {
  const configHome = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "systemd", "user", getSystemdServiceName(uin));
}

function getEntryPath(): string {
  // dist/commands/service/_helpers.js → dist/daemon/entry.js
  return path.resolve(__dirname, "../../daemon/entry.js");
}

// ─── service file builders ────────────────────────────────────────────────────

export function buildLaunchdPlist(uin: number): string {
  const nodePath = process.execPath;
  const entryPath = getEntryPath();
  const logPath = getLogPath(uin);
  const label = getLaunchdLabel(uin);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${entryPath}</string>
        <string>${uin}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${logPath}</string>
    <key>StandardErrorPath</key>
    <string>${logPath}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${os.homedir()}</string>
        <key>PATH</key>
        <string>${path.dirname(nodePath)}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
`;
}

export function buildSystemdUnit(uin: number): string {
  const nodePath = process.execPath;
  const entryPath = getEntryPath();
  const logPath = getLogPath(uin);

  return `[Unit]
Description=icqq QQ daemon for account ${uin}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${nodePath} ${entryPath} ${uin}
Restart=on-failure
RestartSec=10
StandardOutput=append:${logPath}
StandardError=append:${logPath}
Environment=HOME=${os.homedir()}
Environment=PATH=${path.dirname(nodePath)}:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

[Install]
WantedBy=default.target
`;
}

// ─── account helpers ──────────────────────────────────────────────────────────

export async function getAllUins(): Promise<number[]> {
  const config = await loadConfig();
  return Object.keys(config.accounts).map(Number).filter((n) => !Number.isNaN(n) && n > 0);
}

/**
 * 根据 argUin 和 -a 标志解析目标 uin 列表。
 * - `-a` → 所有已配置账号
 * - argUin 指定 → 单账号
 * - 都未指定 → currentUin / ICQQ_CURRENT_UIN
 */
export async function resolveUins(argUin: number | undefined, all: boolean): Promise<number[]> {
  if (all) {
    const uins = await getAllUins();
    if (uins.length === 0) throw new Error("未找到已配置的账号，请先执行 icqq login");
    return uins;
  }
  if (argUin !== undefined) return [argUin];
  return [await resolveUin()];
}

// ─── service state ────────────────────────────────────────────────────────────

export type ServiceState = {
  installed: boolean;
  filePath: string;
  running: boolean;
  pid: number | null;
  lastExitCode: number | null;
};

// ─── install / uninstall ──────────────────────────────────────────────────────

export async function installService(uin: number, log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _installLaunchd(uin, log);
  } else {
    await _installSystemd(uin, log);
  }
}

export async function uninstallService(uin: number, log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _uninstallLaunchd(uin, log);
  } else {
    await _uninstallSystemd(uin, log);
  }
}

// ─── start / stop ─────────────────────────────────────────────────────────────

/** 启动已安装的系统服务（文件必须存在）。 */
export async function startService(uin: number, log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _startLaunchd(uin, log);
  } else {
    await _startSystemd(uin, log);
  }
}

/** 停止已安装的系统服务（不删除文件，不影响 icqq stop）。 */
export async function stopService(uin: number, log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _stopLaunchd(uin, log);
  } else {
    await _stopSystemd(uin, log);
  }
}

// ─── status query ─────────────────────────────────────────────────────────────

export async function queryService(uin: number): Promise<ServiceState> {
  return process.platform === "darwin"
    ? _queryLaunchd(uin)
    : _querySystemd(uin);
}

// ─── launchd impl ─────────────────────────────────────────────────────────────

async function _installLaunchd(uin: number, log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath(uin);
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  // Unload existing (ignore errors)
  try { execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "ignore" }); } catch { /* ignore */ }
  log(`写入 plist → ${plistPath}`);
  await fs.writeFile(plistPath, buildLaunchdPlist(uin), { mode: 0o644 });
  log("加载 launchd 服务…");
  execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
}

async function _uninstallLaunchd(uin: number, log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath(uin);
  try { await fs.access(plistPath); } catch {
    throw new Error(`未找到 plist: ${plistPath}，请确认服务已安装`);
  }
  log("停止并卸载 launchd 服务…");
  try { execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" }); } catch { /* already stopped */ }
  log(`删除 plist → ${plistPath}`);
  await fs.unlink(plistPath);
}

async function _startLaunchd(uin: number, log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath(uin);
  try { await fs.access(plistPath); } catch {
    throw new Error(`服务未安装，请先执行 icqq service install`);
  }
  log("启动 launchd 服务…");
  execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
}

async function _stopLaunchd(uin: number, log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath(uin);
  try { await fs.access(plistPath); } catch {
    throw new Error(`服务未安装，请先执行 icqq service install`);
  }
  log("停止 launchd 服务…");
  try { execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" }); } catch { /* already stopped */ }
}

async function _queryLaunchd(uin: number): Promise<ServiceState> {
  const plistPath = getLaunchdPlistPath(uin);
  let installed = false;
  try { await fs.access(plistPath); installed = true; } catch { /* not installed */ }

  let running = false;
  let pid: number | null = null;
  let lastExitCode: number | null = null;

  if (installed) {
    try {
      const out = execSync(`launchctl list "${getLaunchdLabel(uin)}" 2>/dev/null`, { encoding: "utf-8" });
      const pidMatch = out.match(/"PID"\s*=\s*(\d+)/);
      const exitMatch = out.match(/"LastExitStatus"\s*=\s*(\d+)/);
      if (pidMatch) { pid = Number(pidMatch[1]); running = pid > 0; }
      if (exitMatch) lastExitCode = Number(exitMatch[1]);
    } catch { /* service not loaded */ }
  }

  return { installed, filePath: plistPath, running, pid, lastExitCode };
}

// ─── systemd impl ─────────────────────────────────────────────────────────────

async function _installSystemd(uin: number, log: (s: string) => void): Promise<void> {
  const svcPath = getSystemdServicePath(uin);
  const svcName = getSystemdServiceName(uin);
  await fs.mkdir(path.dirname(svcPath), { recursive: true });
  try { execSync(`systemctl --user disable --now "${svcName}" 2>/dev/null`, { stdio: "ignore" }); } catch { /* ignore */ }
  log(`写入 service → ${svcPath}`);
  await fs.writeFile(svcPath, buildSystemdUnit(uin), { mode: 0o644 });
  log("重载 systemd 配置并启用服务…");
  execSync("systemctl --user daemon-reload", { stdio: "pipe" });
  execSync(`systemctl --user enable --now "${svcName}"`, { stdio: "pipe" });
}

async function _uninstallSystemd(uin: number, log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName(uin);
  const svcPath = getSystemdServicePath(uin);
  try { await fs.access(svcPath); } catch {
    throw new Error(`未找到 service 文件: ${svcPath}，请确认服务已安装`);
  }
  log("停止并禁用 systemd 服务…");
  try { execSync(`systemctl --user disable --now "${svcName}"`, { stdio: "pipe" }); } catch { /* ignore */ }
  log(`删除 service 文件 → ${svcPath}`);
  await fs.unlink(svcPath);
  log("重载 systemd 配置…");
  execSync("systemctl --user daemon-reload", { stdio: "pipe" });
}

async function _startSystemd(uin: number, log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName(uin);
  const svcPath = getSystemdServicePath(uin);
  try { await fs.access(svcPath); } catch {
    throw new Error(`服务未安装，请先执行 icqq service install`);
  }
  log("启动 systemd 服务…");
  execSync(`systemctl --user start "${svcName}"`, { stdio: "pipe" });
}

async function _stopSystemd(uin: number, log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName(uin);
  const svcPath = getSystemdServicePath(uin);
  try { await fs.access(svcPath); } catch {
    throw new Error(`服务未安装，请先执行 icqq service install`);
  }
  log("停止 systemd 服务…");
  execSync(`systemctl --user stop "${svcName}"`, { stdio: "pipe" });
}

async function _querySystemd(uin: number): Promise<ServiceState> {
  const svcName = getSystemdServiceName(uin);
  const svcPath = getSystemdServicePath(uin);
  let installed = false;
  try { await fs.access(svcPath); installed = true; } catch { /* not installed */ }

  let running = false;
  let pid: number | null = null;
  let lastExitCode: number | null = null;

  if (installed) {
    try {
      const active = execSync(`systemctl --user is-active "${svcName}" 2>/dev/null`, { encoding: "utf-8" }).trim();
      running = active === "active";
    } catch { /* not active */ }
    try {
      const show = execSync(`systemctl --user show "${svcName}" --property=MainPID,ExecMainStatus 2>/dev/null`, { encoding: "utf-8" });
      const pidMatch = show.match(/MainPID=(\d+)/);
      const exitMatch = show.match(/ExecMainStatus=(\d+)/);
      if (pidMatch) pid = Number(pidMatch[1]) || null;
      if (exitMatch) lastExitCode = Number(exitMatch[1]);
    } catch { /* ignore */ }
  }

  return { installed, filePath: svcPath, running, pid, lastExitCode };
}

/**
 * icqq service — 全局系统服务（单例 launchd/systemd，无按账号拆分）。
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig } from "@/lib/config.js";
import { getSupervisorLogPath } from "@/lib/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LAUNCHD_LABEL = "com.icqq.daemon";
const SYSTEMD_SERVICE_NAME = "icqq.service";

export function getLaunchdLabel(): string {
  return LAUNCHD_LABEL;
}

export function getLaunchdPlistPath(): string {
  return path.join(
    os.homedir(),
    "Library",
    "LaunchAgents",
    `${LAUNCHD_LABEL}.plist`,
  );
}

export function getSystemdServiceName(): string {
  return SYSTEMD_SERVICE_NAME;
}

export function getSystemdServicePath(): string {
  const configHome =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "systemd", "user", SYSTEMD_SERVICE_NAME);
}

function getSupervisorPath(): string {
  return path.resolve(__dirname, "../../daemon/supervisor.js");
}

export function buildLaunchdPlist(): string {
  const nodePath = process.execPath;
  const supervisorPath = getSupervisorPath();
  const logPath = getSupervisorLogPath();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LAUNCHD_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${supervisorPath}</string>
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

export function buildSystemdUnit(): string {
  const nodePath = process.execPath;
  const supervisorPath = getSupervisorPath();
  const logPath = getSupervisorLogPath();

  return `[Unit]
Description=icqq QQ daemon supervisor (all accounts)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${nodePath} ${supervisorPath}
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

export async function getAllUins(): Promise<number[]> {
  const config = await loadConfig();
  return Object.keys(config.accounts)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0)
    .sort((a, b) => a - b);
}

export type ServiceState = {
  installed: boolean;
  filePath: string;
  running: boolean;
  pid: number | null;
  lastExitCode: number | null;
};

/** 卸载遗留的按账号拆分的旧版服务文件 */
async function migrateLegacyPerAccountServices(log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    const dir = path.join(os.homedir(), "Library", "LaunchAgents");
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    const legacy = entries.filter(
      (e) =>
        e.startsWith("com.icqq.daemon.") &&
        e.endsWith(".plist") &&
        e !== `${LAUNCHD_LABEL}.plist`,
    );
    for (const file of legacy) {
      const plistPath = path.join(dir, file);
      log(`移除旧版服务 ${file}…`);
      try {
        execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "ignore" });
      } catch {
        /* ignore */
      }
      try {
        await fs.unlink(plistPath);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  const configHome =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  const dir = path.join(configHome, "systemd", "user");
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  const legacy = entries.filter(
    (e) => e.startsWith("icqq-") && e.endsWith(".service") && e !== SYSTEMD_SERVICE_NAME,
  );
  for (const file of legacy) {
    const svcPath = path.join(dir, file);
    const svcName = file;
    log(`移除旧版服务 ${file}…`);
    try {
      execSync(`systemctl --user disable --now "${svcName}" 2>/dev/null`, {
        stdio: "ignore",
      });
    } catch {
      /* ignore */
    }
    try {
      await fs.unlink(svcPath);
    } catch {
      /* ignore */
    }
  }
  if (legacy.length > 0) {
    try {
      execSync("systemctl --user daemon-reload", { stdio: "pipe" });
    } catch {
      /* ignore */
    }
  }
}

export async function installService(log: (s: string) => void): Promise<void> {
  await migrateLegacyPerAccountServices(log);
  if (process.platform === "darwin") {
    await _installLaunchd(log);
  } else {
    await _installSystemd(log);
  }
}

export async function uninstallService(log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _uninstallLaunchd(log);
  } else {
    await _uninstallSystemd(log);
  }
}

export async function startService(log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _startLaunchd(log);
  } else {
    await _startSystemd(log);
  }
}

export async function stopService(log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _stopLaunchd(log);
  } else {
    await _stopSystemd(log);
  }
}

export async function restartService(log: (s: string) => void): Promise<void> {
  if (process.platform === "darwin") {
    await _restartLaunchd(log);
  } else {
    await _restartSystemd(log);
  }
}

export async function queryService(): Promise<ServiceState> {
  return process.platform === "darwin" ? _queryLaunchd() : _querySystemd();
}

async function _installLaunchd(log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath();
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null`, { stdio: "ignore" });
  } catch {
    /* ignore */
  }
  log(`写入 plist → ${plistPath}`);
  await fs.writeFile(plistPath, buildLaunchdPlist(), { mode: 0o644 });
  log("加载 launchd 服务…");
  execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
}

async function _uninstallLaunchd(log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath();
  try {
    await fs.access(plistPath);
  } catch {
    throw new Error(`未找到 plist: ${plistPath}，请确认服务已安装`);
  }
  log("停止并卸载 launchd 服务…");
  try {
    execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" });
  } catch {
    /* already stopped */
  }
  log(`删除 plist → ${plistPath}`);
  await fs.unlink(plistPath);
}

async function _startLaunchd(log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath();
  try {
    await fs.access(plistPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  log("启动 launchd 服务…");
  execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
}

async function _stopLaunchd(log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath();
  try {
    await fs.access(plistPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  log("停止 launchd 服务…");
  try {
    execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" });
  } catch {
    /* already stopped */
  }
}

async function _restartLaunchd(log: (s: string) => void): Promise<void> {
  const plistPath = getLaunchdPlistPath();
  try {
    await fs.access(plistPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  const state = await _queryLaunchd();
  if (state.running) {
    const uid = process.getuid?.();
    if (uid === undefined) {
      throw new Error("无法获取当前用户 UID");
    }
    const target = `gui/${uid}/${LAUNCHD_LABEL}`;
    log(`重启 launchd 服务 (${target})…`);
    try {
      execSync(`launchctl kickstart -k "${target}"`, { stdio: "pipe" });
      return;
    } catch {
      log("kickstart 失败，改用 unload/load…");
    }
  }
  await _stopLaunchd(log);
  await _startLaunchd(log);
}

async function _queryLaunchd(): Promise<ServiceState> {
  const plistPath = getLaunchdPlistPath();
  let installed = false;
  try {
    await fs.access(plistPath);
    installed = true;
  } catch {
    /* not installed */
  }

  let running = false;
  let pid: number | null = null;
  let lastExitCode: number | null = null;

  if (installed) {
    try {
      const out = execSync(`launchctl list "${LAUNCHD_LABEL}" 2>/dev/null`, {
        encoding: "utf-8",
      });
      const pidMatch = out.match(/"PID"\s*=\s*(\d+)/);
      const exitMatch = out.match(/"LastExitStatus"\s*=\s*(\d+)/);
      if (pidMatch) {
        pid = Number(pidMatch[1]);
        running = pid > 0;
      }
      if (exitMatch) lastExitCode = Number(exitMatch[1]);
    } catch {
      /* service not loaded */
    }
  }

  return { installed, filePath: plistPath, running, pid, lastExitCode };
}

async function _installSystemd(log: (s: string) => void): Promise<void> {
  const svcPath = getSystemdServicePath();
  const svcName = getSystemdServiceName();
  await fs.mkdir(path.dirname(svcPath), { recursive: true });
  try {
    execSync(`systemctl --user disable --now "${svcName}" 2>/dev/null`, {
      stdio: "ignore",
    });
  } catch {
    /* ignore */
  }
  log(`写入 service → ${svcPath}`);
  await fs.writeFile(svcPath, buildSystemdUnit(), { mode: 0o644 });
  log("重载 systemd 配置并启用服务…");
  execSync("systemctl --user daemon-reload", { stdio: "pipe" });
  execSync(`systemctl --user enable --now "${svcName}"`, { stdio: "pipe" });
}

async function _uninstallSystemd(log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName();
  const svcPath = getSystemdServicePath();
  try {
    await fs.access(svcPath);
  } catch {
    throw new Error(`未找到 service 文件: ${svcPath}，请确认服务已安装`);
  }
  log("停止并禁用 systemd 服务…");
  try {
    execSync(`systemctl --user disable --now "${svcName}"`, { stdio: "pipe" });
  } catch {
    /* ignore */
  }
  log(`删除 service 文件 → ${svcPath}`);
  await fs.unlink(svcPath);
  log("重载 systemd 配置…");
  execSync("systemctl --user daemon-reload", { stdio: "pipe" });
}

async function _startSystemd(log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName();
  const svcPath = getSystemdServicePath();
  try {
    await fs.access(svcPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  log("启动 systemd 服务…");
  execSync(`systemctl --user start "${svcName}"`, { stdio: "pipe" });
}

async function _stopSystemd(log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName();
  const svcPath = getSystemdServicePath();
  try {
    await fs.access(svcPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  log("停止 systemd 服务…");
  execSync(`systemctl --user stop "${svcName}"`, { stdio: "pipe" });
}

async function _restartSystemd(log: (s: string) => void): Promise<void> {
  const svcName = getSystemdServiceName();
  const svcPath = getSystemdServicePath();
  try {
    await fs.access(svcPath);
  } catch {
    throw new Error("服务未安装，请先执行 icqq service install");
  }
  log("重启 systemd 服务…");
  execSync(`systemctl --user restart "${svcName}"`, { stdio: "pipe" });
}

async function _querySystemd(): Promise<ServiceState> {
  const svcName = getSystemdServiceName();
  const svcPath = getSystemdServicePath();
  let installed = false;
  try {
    await fs.access(svcPath);
    installed = true;
  } catch {
    /* not installed */
  }

  let running = false;
  let pid: number | null = null;
  let lastExitCode: number | null = null;

  if (installed) {
    try {
      const active = execSync(
        `systemctl --user is-active "${svcName}" 2>/dev/null`,
        { encoding: "utf-8" },
      ).trim();
      running = active === "active";
    } catch {
      /* not active */
    }
    try {
      const show = execSync(
        `systemctl --user show "${svcName}" --property=MainPID,ExecMainStatus 2>/dev/null`,
        { encoding: "utf-8" },
      );
      const pidMatch = show.match(/MainPID=(\d+)/);
      const exitMatch = show.match(/ExecMainStatus=(\d+)/);
      if (pidMatch) pid = Number(pidMatch[1]) || null;
      if (exitMatch) lastExitCode = Number(exitMatch[1]);
    } catch {
      /* ignore */
    }
  }

  return { installed, filePath: svcPath, running, pid, lastExitCode };
}

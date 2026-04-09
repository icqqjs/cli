import React, { useState, useEffect } from "react";
import { Text, Box, useApp, useInput } from "ink";
import zod from "zod";
import { option } from "pastel";
import type { Platform } from "@icqqjs/icqq";
import { LoginFlow } from "@/components/LoginFlow.js";
import { Spinner } from "@/components/Spinner.js";
import { resolveIcqq } from "@/lib/icqq-resolve.js";
import {
  loadConfig,
  saveConfig,
  setAccountConfig,
  getAccountConfig,
  type AccountConfig,
} from "@/lib/config.js";
import {
  getAccountDir,
  getTmpDir,
} from "@/lib/paths.js";
import {
  spawnDaemon,
  isDaemonRunning,
  stopDaemon,
} from "@/daemon/lifecycle.js";
import fs from "node:fs/promises";
import path from "node:path";

export const description = "登录 QQ 账号并启动守护进程";

const PLATFORMS = [
  { value: 1, label: "Android" },
  { value: 2, label: "aPad" },
  { value: 3, label: "Watch" },
  { value: 4, label: "iMac" },
  { value: 5, label: "iPad" },
] as const;

export const options = zod.object({
  q: zod
    .number()
    .optional()
    .describe(
      option({
        description: "QQ号（扫码可不指定）",
        alias: "q",
      }),
    ),
  p: zod
    .boolean()
    .default(false)
    .describe(
      option({
        description: "密码登录（交互式输入密码）",
        alias: "p",
      }),
    ),
  c: zod
    .string()
    .optional()
    .describe(
      option({
        description: "配置文件路径",
        alias: "c",
      }),
    ),
  r: zod
    .boolean()
    .default(false)
    .describe(
      option({
        description: "快速重连（使用已保存的 token，跳过登录向导）",
        alias: "r",
      }),
    ),
});

type Props = {
  options: zod.infer<typeof options>;
};

type WizardStep = "qq" | "ask_password" | "password" | "platform" | "ver" | "sign_api" | "confirm";
type Status = "wizard" | "login" | "post-login" | "starting-daemon" | "done" | "error";

/* ── Wizard prompt component ────────────────────────────── */

function WizardPrompt({
  onComplete,
  initialQQ,
  needPassword,
  savedAccount,
}: {
  onComplete: (result: {
    qq?: number;
    platform: number;
    signApiUrl: string;
    ver: string;
    password?: string;
  }) => void;
  initialQQ?: number;
  needPassword: boolean;
  savedAccount?: AccountConfig;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");

  const [qq, setQQ] = useState(initialQQ ? String(initialQQ) : "");
  const [wantPassword, setWantPassword] = useState(needPassword);
  const [askPwIdx, setAskPwIdx] = useState(needPassword ? 0 : 1); // 0=是, 1=否
  const [password, setPassword] = useState("");
  const [platformIdx, setPlatformIdx] = useState(
    () => Math.max(0, PLATFORMS.findIndex((p) => p.value === (savedAccount?.platform ?? 1))),
  );
  const [platform, setPlatform] = useState(savedAccount?.platform ?? 1);
  const [ver, setVer] = useState(savedAccount?.ver ?? "");
  const [signApiUrl, setSignApiUrl] = useState(savedAccount?.signApiUrl ?? "");

  // Compute steps dynamically based on password choice
  const steps: WizardStep[] = [];
  if (!initialQQ) steps.push("qq");
  if (!needPassword) steps.push("ask_password");
  if (wantPassword || needPassword) steps.push("password");
  steps.push("platform", "ver", "sign_api", "confirm");

  const currentStep = steps[stepIdx]!;

  const advance = () => {
    setInputValue("");
    setStepIdx((prev) => prev + 1);
  };

  useInput((input, key) => {
    // ask_password step: arrow toggle yes/no
    if (currentStep === "ask_password") {
      if (key.upArrow || key.downArrow) {
        setAskPwIdx((prev) => (prev === 0 ? 1 : 0));
        return;
      }
      if (key.return) {
        setWantPassword(askPwIdx === 0);
        advance();
        return;
      }
      return;
    }

    // platform step: arrow selection
    if (currentStep === "platform") {
      if (key.upArrow) {
        setPlatformIdx((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setPlatformIdx((prev) => Math.min(PLATFORMS.length - 1, prev + 1));
        return;
      }
      if (key.return) {
        setPlatform(PLATFORMS[platformIdx]!.value);
        advance();
        return;
      }
      return;
    }

    if (currentStep === "confirm") {
      if (key.return) {
        onComplete({
          qq: qq ? Number(qq) : undefined,
          platform,
          signApiUrl,
          ver,
          password: password || undefined,
        });
      }
      return;
    }

    // Text input steps: qq, ver, sign_api, password
    if (key.return) {
      if (currentStep === "qq") {
        setQQ(inputValue);
      } else if (currentStep === "ver") {
        setVer(inputValue);
      } else if (currentStep === "sign_api") {
        setSignApiUrl(inputValue);
      } else if (currentStep === "password") {
        setPassword(inputValue);
      }
      advance();
      return;
    }
    if (key.backspace || key.delete) {
      setInputValue((v) => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setInputValue((v) => v + input);
    }
  });

  // Pre-fill input value when entering a step with saved data
  useEffect(() => {
    if (currentStep === "sign_api" && savedAccount?.signApiUrl) {
      setInputValue(savedAccount.signApiUrl);
    }
    if (currentStep === "ver" && savedAccount?.ver) {
      setInputValue(savedAccount.ver);
    }
  }, [currentStep, savedAccount?.signApiUrl, savedAccount?.ver]);

  const completedEntries: [string, string][] = [];
  for (let i = 0; i < stepIdx; i++) {
    const s = steps[i]!;
    if (s === "qq") completedEntries.push(["QQ号", qq || "(扫码登录)"]);
    if (s === "ask_password") completedEntries.push(["密码登录", wantPassword ? "是" : "否"]);
    if (s === "password") completedEntries.push(["密码", "●".repeat(password.length || 1)]);
    if (s === "platform") {
      const p = PLATFORMS.find((x) => x.value === platform);
      completedEntries.push(["平台", `${p?.label ?? platform}`]);
    }
    if (s === "ver") completedEntries.push(["协议版本", ver || "(默认)"]);
    if (s === "sign_api") completedEntries.push(["签名API", signApiUrl || "(无)"]);
  }

  const ASK_PW_OPTIONS = ["是", "否"] as const;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">━━ 登录配置 ━━</Text>
      {savedAccount && (
        <Text dimColor>已加载已保存配置，直接回车可使用默认值</Text>
      )}
      <Box marginTop={1} flexDirection="column">
        {completedEntries.map(([label, value]) => (
          <Text key={label}>
            <Text color="green">✔ </Text>
            <Text>{label}: </Text>
            <Text color="white">{value}</Text>
          </Text>
        ))}
      </Box>

      {currentStep === "qq" && (
        <Box marginTop={1} flexDirection="column">
          <Text>QQ号 <Text dimColor>(留空则扫码登录)</Text>:</Text>
          <Box>
            <Text color="green">❯ </Text>
            <Text>{inputValue}<Text color="cyan">█</Text></Text>
          </Box>
        </Box>
      )}

      {currentStep === "ask_password" && (
        <Box marginTop={1} flexDirection="column">
          <Text>是否使用密码登录？ <Text dimColor>(↑↓选择, 回车确认)</Text></Text>
          {ASK_PW_OPTIONS.map((label, i) => (
            <Text key={label}>
              <Text color={i === askPwIdx ? "cyan" : undefined}>
                {i === askPwIdx ? "❯ " : "  "}{label}
              </Text>
            </Text>
          ))}
        </Box>
      )}

      {currentStep === "password" && (
        <Box marginTop={1} flexDirection="column">
          <Text>请输入密码:</Text>
          <Box>
            <Text color="green">❯ </Text>
            <Text>{"●".repeat(inputValue.length)}<Text color="cyan">█</Text></Text>
          </Box>
        </Box>
      )}

      {currentStep === "platform" && (
        <Box marginTop={1} flexDirection="column">
          <Text>选择登录平台 <Text dimColor>(↑↓选择, 回车确认)</Text>:</Text>
          {PLATFORMS.map((p, i) => (
            <Text key={p.value}>
              <Text color={i === platformIdx ? "cyan" : undefined}>
                {i === platformIdx ? "❯ " : "  "}
                {p.value}. {p.label}
              </Text>
            </Text>
          ))}
        </Box>
      )}

      {currentStep === "ver" && (
        <Box marginTop={1} flexDirection="column">
          <Text>协议版本 (ver) <Text dimColor>(如 9.1.70，可留空使用默认)</Text>:</Text>
          <Box>
            <Text color="green">❯ </Text>
            <Text>{inputValue}<Text color="cyan">█</Text></Text>
          </Box>
        </Box>
      )}

      {currentStep === "sign_api" && (
        <Box marginTop={1} flexDirection="column">
          <Text>签名API地址 <Text dimColor>(可留空跳过)</Text>:</Text>
          <Box>
            <Text color="green">❯ </Text>
            <Text>{inputValue}<Text color="cyan">█</Text></Text>
          </Box>
        </Box>
      )}

      {currentStep === "confirm" && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="yellow">
            按回车开始登录…
          </Text>
        </Box>
      )}
    </Box>
  );
}

/* ── Main Login component ───────────────────────────────── */

export default function Login({ options: opts }: Props) {
  const { exit } = useApp();
  const [status, setStatus] = useState<Status>("wizard");
  const [error, setError] = useState("");
  const [client, setClient] = useState<any>(null);
  const [dataDir, setDataDir] = useState("");
  const [savedAccount, setSavedAccount] = useState<AccountConfig | undefined>();
  const [resolvedQQ, setResolvedQQ] = useState<number | undefined>(opts.q);
  const [finalOpts, setFinalOpts] = useState<{
    qq?: number; password?: string; platform: number; signApiUrl: string; ver: string;
  }>({ platform: 1, signApiUrl: "", ver: "" });

  // Load config on mount & check if already running
  useEffect(() => {
    void (async () => {
      try {
        // Resolve target uin: explicit -q or fallback to currentUin
        const config = await loadConfig();
        const targetUin = opts.q ?? config.currentUin;

        // Check if daemon already running
        if (targetUin && await isDaemonRunning(targetUin)) {
          setError(`账号 ${targetUin} 的守护进程已在运行中`);
          setStatus("error");
          return;
        }

        let account: AccountConfig | undefined;
        if (opts.c) {
          // External config file
          const raw = await fs.readFile(path.resolve(opts.c), "utf-8");
          const cfg = JSON.parse(raw) as Record<string, unknown>;
          account = {
            platform: (cfg.platform as number) ?? (cfg.plm as number) ?? 1,
            signApiUrl: (cfg.sign_api_url as string) ?? (cfg.sign_api_addr as string) ?? (cfg.sau as string) ?? "",
            ver: cfg.ver as string | undefined,
          };
        } else if (targetUin) {
          if (!opts.q) setResolvedQQ(targetUin);
          account = getAccountConfig(config, targetUin);
        }
        if (account) setSavedAccount(account);

        // Quick reconnect: skip wizard, directly spawn daemon with cached token
        if (opts.r) {
          if (!targetUin) {
            setError("快速重连需要指定 QQ 号 (-q) 或已设置 currentUin");
            setStatus("error");
            return;
          }
          // Already checked not running above
          if (!getAccountConfig(config, targetUin)) {
            setError(`账号 ${targetUin} 无已保存的配置，请先完整登录一次`);
            setStatus("error");
            return;
          }
          setStatus("starting-daemon");
          await spawnDaemon(targetUin);
          setStatus("done");
          return;
        }
      } catch {
        // Config doesn't exist or is invalid — will ask everything
      }
    })();
  }, [opts.c, opts.q, opts.r]);

  useEffect(() => {
    if (status === "done" || status === "error") {
      if (status === "error") process.exitCode = 1;
      const timer = setTimeout(() => exit(), status === "error" ? 2000 : 300);
      return () => clearTimeout(timer);
    }
  }, [status, exit]);

  const handleWizardComplete = async (result: {
    qq?: number;
    platform: number;
    signApiUrl: string;
    ver: string;
    password?: string;
  }) => {
    const merged = { ...result };
    setFinalOpts(merged);

    // Check if this uin's daemon is already running
    if (merged.qq && await isDaemonRunning(merged.qq)) {
      setError(`账号 ${merged.qq} 的守护进程已在运行中`);
      setStatus("error");
      return;
    }

    setStatus("login");

    const dir = merged.qq ? getAccountDir(merged.qq) : getTmpDir();
    await fs.mkdir(dir, { recursive: true });
    const { createClient } = await resolveIcqq();
    const c = createClient({
      platform: merged.platform as Platform,
      sign_api_addr: merged.signApiUrl || undefined,
      ver: merged.ver || savedAccount?.ver || undefined,
      data_dir: dir,
      log_level: "warn",
    });
    setClient(c);
    setDataDir(dir);
  };

  const handleLoginComplete = async () => {
    if (!client) return;
    const actualUin = client.uin as number;
    setStatus("post-login");

    try {
      // If no uin was given, move data from tmp dir to account dir
      if (!finalOpts.qq) {
        const tmpDir = getTmpDir();
        const accountDir = getAccountDir(actualUin);
        await fs.mkdir(accountDir, { recursive: true });
        for (const entry of await fs.readdir(tmpDir, {
          withFileTypes: true,
        })) {
          const src = path.join(tmpDir, entry.name);
          const dest = path.join(accountDir, entry.name);
          await fs.cp(src, dest, { recursive: true, force: true });
        }
        await fs.rm(tmpDir, { recursive: true, force: true });
      }

      // Save config
      const config = await loadConfig();
      setAccountConfig(config, actualUin, {
        platform: finalOpts.platform,
        signApiUrl: finalOpts.signApiUrl ?? "",
        ver: finalOpts.ver || savedAccount?.ver,
      });
      config.currentUin = actualUin;
      await saveConfig(config);

      // Terminate login client (don't logout — preserve token)
      try {
        client.terminate();
      } catch {
        /* ignore */
      }

      // Stop existing daemon if running
      if (await isDaemonRunning(actualUin)) {
        await stopDaemon(actualUin);
      }

      // Spawn daemon
      setStatus("starting-daemon");
      await spawnDaemon(actualUin);

      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
      try {
        client.terminate();
      } catch {
        /* ignore */
      }
    }
  };

  const handleLoginError = (err: Error) => {
    setError(err.message);
    setStatus("error");
    try {
      client?.terminate();
    } catch {
      /* ignore */
    }
  };

  return (
    <Box flexDirection="column">
      {status === "wizard" && (
        <WizardPrompt
          onComplete={(r) => void handleWizardComplete(r)}
          initialQQ={resolvedQQ}
          needPassword={opts.p}
          savedAccount={savedAccount}
        />
      )}

      {status === "login" && !client && <Spinner label="初始化…" />}

      {status === "login" && client && (
        <LoginFlow
          client={client}
          dataDir={dataDir}
          uin={finalOpts.qq}
          password={finalOpts.password}
          onComplete={() => void handleLoginComplete()}
          onError={handleLoginError}
        />
      )}

      {status === "post-login" && <Spinner label="正在保存配置…" />}

      {status === "starting-daemon" && (
        <Spinner label="正在启动守护进程…" />
      )}

      {status === "done" && (
        <Text color="green">
          ✔ 登录成功，守护进程已启动。
        </Text>
      )}

      {status === "error" && <Text color="red">✖ {error}</Text>}
    </Box>
  );
}

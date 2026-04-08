import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import zod from "zod";
import { option } from "pastel";
import { createClient, type Platform } from "@icqqjs/icqq";
import { LoginFlow } from "@/components/LoginFlow.js";
import { Spinner } from "@/components/Spinner.js";
import {
  loadConfig,
  saveConfig,
  setAccountConfig,
  getAccountConfig,
} from "@/lib/config.js";
import {
  getAccountDir,
  getIcqqHome,
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
  pwd: zod
    .string()
    .optional()
    .describe(
      option({
        description: "密码（不指定则扫码登录）",
      }),
    ),
  plm: zod
    .number()
    .optional()
    .describe(
      option({
        description: "平台 1=Android 2=aPad 3=Watch 4=iMac 5=iPad",
      }),
    ),
  sau: zod
    .string()
    .optional()
    .describe(
      option({
        description: "sign_api_url",
      }),
    ),
  ver: zod
    .string()
    .optional()
    .describe(
      option({
        description: "协议版本号",
      }),
    ),
  config: zod
    .string()
    .optional()
    .describe(
      option({
        description: "登录配置文件路径 (JSON)",
        alias: "c",
      }),
    ),
  reconnect: zod
    .boolean()
    .default(false)
    .describe(
      option({
        description: "使用已保存配置快速重连（无需重复输入参数）",
        alias: "r",
      }),
    ),
});

type Props = {
  options: zod.infer<typeof options>;
};

type Status = "login" | "post-login" | "starting-daemon" | "done" | "error";

export default function Login({ options: opts }: Props) {
  const { exit } = useApp();
  const [status, setStatus] = useState<Status>("login");
  const [error, setError] = useState("");
  const [client, setClient] = useState<any>(null);
  const [dataDir, setDataDir] = useState("");
  const [mergedOpts, setMergedOpts] = useState<{
    q?: number; pwd?: string; plm: number; sau?: string; ver?: string;
  }>({ plm: opts.plm ?? 1 });

  useEffect(() => {
    void (async () => {
      // --reconnect: read saved config for defaultUin
      if (opts.reconnect) {
        try {
          const config = await loadConfig();
          const uin = config.defaultUin;
          if (!uin) throw new Error("无已保存的账号，请先完整登录一次");
          const account = getAccountConfig(config, uin);
          if (!account) throw new Error(`未找到账号 ${uin} 的配置`);

          // If daemon is already running, just report
          if (await isDaemonRunning(uin)) {
            setStatus("done");
            return;
          }

          // Try to spawn daemon directly with cached token
          setStatus("starting-daemon");
          await spawnDaemon(uin);
          setStatus("done");
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("error");
        }
        return;
      }

      // Merge options: config file < CLI flags
      let qq = opts.q;
      let pwd = opts.pwd;
      let plm = opts.plm;
      let sau = opts.sau;
      let ver = opts.ver;

      if (opts.config) {
        try {
          const raw = await fs.readFile(path.resolve(opts.config), "utf-8");
          const cfg = JSON.parse(raw) as Record<string, unknown>;
          qq = qq ?? (cfg.qq as number | undefined) ?? (cfg.uin as number | undefined);
          pwd = pwd ?? (cfg.password as string | undefined) ?? (cfg.pwd as string | undefined);
          plm = plm ?? (cfg.platform as number | undefined) ?? (cfg.plm as number | undefined);
          sau = sau ?? (cfg.sign_api_url as string | undefined) ?? (cfg.sau as string | undefined) ?? (cfg.sign_api_addr as string | undefined);
          ver = ver ?? (cfg.ver as string | undefined);
        } catch (e) {
          setError(`读取配置文件失败: ${e instanceof Error ? e.message : String(e)}`);
          setStatus("error");
          return;
        }
      }

      setMergedOpts({ q: qq, pwd, plm: plm ?? 1, sau, ver });

      const dir = qq ? getAccountDir(qq) : getTmpDir();
      const c = createClient({
        platform: (plm ?? 1) as Platform,
        sign_api_addr: sau || undefined,
        ver: ver || undefined,
        data_dir: dir,
        log_level: "warn",
      });
      setClient(c);
      setDataDir(dir);
      await fs.mkdir(dir, { recursive: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "done" || status === "error") {
      const timer = setTimeout(() => exit(), 300);
      return () => clearTimeout(timer);
    }
  }, [status, exit]);

  const handleLoginComplete = async () => {
    if (!client) return;
    const actualUin = client.uin as number;
    setStatus("post-login");

    try {
      // If no uin was given, move data from tmp dir to account dir
      if (!mergedOpts.q) {
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
        platform: mergedOpts.plm,
        signApiUrl: mergedOpts.sau ?? "",
        ver: mergedOpts.ver,
      });
      config.defaultUin = actualUin;
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

  if (!client) return <Spinner label="初始化…" />;

  return (
    <Box flexDirection="column">
      {status === "login" && (
        <LoginFlow
          client={client}
          dataDir={dataDir}
          uin={mergedOpts.q}
          password={mergedOpts.pwd}
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

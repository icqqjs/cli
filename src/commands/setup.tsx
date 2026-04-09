import React, { useState, useEffect } from "react";
import { Text, Box, useApp } from "ink";
import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { isIcqqAvailable, getIcqqPath } from "@/lib/icqq-resolve.js";

export const description = "检查并安装 @icqqjs/icqq 依赖";

type Step = "check" | "npmrc" | "install" | "done" | "already" | "error";
type PM = "pnpm" | "npm" | "cnpm" | "yarn";

/** Detect which package manager was used to install this CLI */
function detectPM(): PM {
  const selfPath = process.argv[1] ?? "";
  if (selfPath.includes("/pnpm/") || selfPath.includes("\\pnpm\\")) return "pnpm";
  if (selfPath.includes("/cnpm/") || selfPath.includes("\\cnpm\\")) return "cnpm";
  if (selfPath.includes("/yarn/") || selfPath.includes("\\yarn\\")) return "yarn";
  // Fallback: check env variables / command availability
  for (const [env, cmd, name] of [
    ["PNPM_HOME", "pnpm", "pnpm"],
    ["CNPM_HOME", "cnpm", "cnpm"],
    ["YARN_GLOBAL_FOLDER", "yarn", "yarn"],
  ] as const) {
    if (process.env[env]) {
      try {
        execSync(`${cmd} --version`, { stdio: "ignore" });
        return name as PM;
      } catch {}
    }
  }
  return "npm";
}

function installCommand(pm: PM): string {
  switch (pm) {
    case "pnpm":  return "pnpm install -g @icqqjs/icqq";
    case "cnpm":  return "cnpm install -g @icqqjs/icqq";
    case "yarn":  return "yarn global add @icqqjs/icqq";
    default:      return "npm install -g @icqqjs/icqq";
  }
}

export default function Setup() {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>("check");
  const [message, setMessage] = useState("");
  const [icqqPath, setIcqqPath] = useState<string | null>(null);
  const [pm, setPm] = useState<PM>("npm");

  useEffect(() => {
    void (async () => {
      try {
        const detectedPM = detectPM();
        setPm(detectedPM);

        // 1. Check if already available
        if (await isIcqqAvailable()) {
          setIcqqPath(await getIcqqPath());
          setStep("already");
          setTimeout(exit, 0);
          return;
        }

        // 2. Ensure @icqqjs scope in ~/.npmrc
        setStep("npmrc");
        const npmrcPath = path.join(homedir(), ".npmrc");
        const scopeLine = "@icqqjs:registry=https://npm.pkg.github.com";
        let npmrcContent = "";
        if (existsSync(npmrcPath)) {
          npmrcContent = readFileSync(npmrcPath, "utf-8");
        }
        if (!npmrcContent.includes("@icqqjs:registry")) {
          appendFileSync(npmrcPath, `\n${scopeLine}\n`, "utf-8");
        }

        // 3. Install using the detected package manager
        setStep("install");
        const installCmd = installCommand(detectedPM);
        try {
          execSync(installCmd, {
            stdio: "inherit",
            timeout: 120_000,
          });
        } catch {
          setMessage(
            `安装失败（使用 ${detectedPM}）。可能需要先登录 GitHub Packages：\n\n` +
            "  npm login --scope=@icqqjs --auth-type=legacy --registry=https://npm.pkg.github.com\n\n" +
            "然后重新运行 icqq setup",
          );
          setStep("error");
          setTimeout(() => exit(new Error("install failed")), 0);
          return;
        }

        // 4. Verify
        if (await isIcqqAvailable()) {
          setStep("done");
        } else {
          setMessage("安装完成但仍无法加载 @icqqjs/icqq，请检查 Node.js 环境。");
          setStep("error");
        }
        setTimeout(exit, 0);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e));
        setStep("error");
        setTimeout(() => exit(new Error("setup failed")), 0);
      }
    })();
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>icqq setup — 安装 @icqqjs/icqq</Text>

      {step === "check" && <Text dimColor>检查依赖状态…（{pm}）</Text>}
      {step === "already" && (
        <Box flexDirection="column">
          <Text color="green">✓ @icqqjs/icqq 已安装，无需额外操作。</Text>
          {icqqPath && <Text dimColor>  路径: {icqqPath}</Text>}
        </Box>
      )}
      {step === "npmrc" && <Text dimColor>配置 ~/.npmrc …</Text>}
      {step === "install" && <Text dimColor>使用 {pm} 安装 @icqqjs/icqq …</Text>}
      {step === "done" && <Text color="green">✓ @icqqjs/icqq 安装完成！现在可以运行 icqq login 了。</Text>}
      {step === "error" && <Text color="red">{message}</Text>}
    </Box>
  );
}

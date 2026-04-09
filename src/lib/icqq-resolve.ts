/**
 * Dynamic resolver for @icqqjs/icqq.
 * Allows the CLI to be installed without icqq and defers the error
 * to runtime with friendly setup instructions.
 */

const SETUP_HINT = `
缺少 @icqqjs/icqq 依赖，请先完成安装：

  1. 配置 npm scope 指向 GitHub Packages：
     echo '@icqqjs:registry=https://npm.pkg.github.com' >> ~/.npmrc

  2. 登录 GitHub Packages（需要 read:packages 权限的 PAT）：
     npm login --scope=@icqqjs --auth-type=legacy --registry=https://npm.pkg.github.com

  3. 安装 icqq：
     npm install -g @icqqjs/icqq

或直接运行: icqq setup
`.trim();

let _mod: typeof import("@icqqjs/icqq") | null = null;

export async function resolveIcqq(): Promise<typeof import("@icqqjs/icqq")> {
  if (_mod) return _mod;
  try {
    _mod = await import("@icqqjs/icqq");
    return _mod;
  } catch {
    throw new Error(SETUP_HINT);
  }
}

export function isIcqqAvailable(): Promise<boolean> {
  return resolveIcqq().then(() => true, () => false);
}

/** Return the directory where @icqqjs/icqq is installed, or null. */
export async function getIcqqPath(): Promise<string | null> {
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("@icqqjs/icqq/package.json");
    const { dirname } = await import("node:path");
    return dirname(pkgPath);
  } catch {
    return null;
  }
}

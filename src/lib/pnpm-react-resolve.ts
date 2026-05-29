import { createRequire } from "node:module";
import { register } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

let installed = false;

/**
 * pnpm v11 全局安装时 @inkjs/ui 可能位于 store/links，无法解析其隐式依赖 react。
 * 在加载 pastel 前注册 resolve 钩子，将来自 @inkjs/ui 的 react 指向本包依赖树。
 */
export function installPnpmReactResolveHook(): void {
  if (installed) return;
  installed = true;

  const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const pkgJson = join(pkgRoot, "package.json");
  if (!existsSync(pkgJson)) return;

  let reactUrl: string;
  try {
    const require = createRequire(pkgJson);
    reactUrl = pathToFileURL(require.resolve("react")).href;
  } catch {
    return;
  }

  const hookSource = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "react" || specifier.startsWith("react/")) {
    const parent = context.parentURL ?? "";
    if (parent.includes("@inkjs/ui")) {
      if (specifier === "react") {
        return { url: ${JSON.stringify(reactUrl)}, shortCircuit: true };
      }
      return nextResolve(specifier, {
        ...context,
        parentURL: ${JSON.stringify(reactUrl)},
      });
    }
  }
  return nextResolve(specifier, context);
}
`;

  register(`data:text/javascript,${encodeURIComponent(hookSource)}`, import.meta.url);
}

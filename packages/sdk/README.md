# @icqqjs/sdk

面向独立业务线的稳定公开 SDK，为 gateway 等模块提供与 icqq 运行时集成的**唯一**依赖边界。

独立业务线应通过本包的子路径访问能力，**不得**直接 `import "@icqqjs/cli/*"` 内部子路径。

## 安装

```bash
npm install @icqqjs/sdk
```

在 monorepo 内开发时，先构建 `@icqqjs/cli`（SDK 的运行时 re-export 依赖其 `dist/` 声明文件）：

```bash
pnpm install
pnpm --filter @icqqjs/cli build
pnpm --filter @icqqjs/sdk build
```

## 子路径导出

| 子路径 | 用途 |
|--------|------|
| `@icqqjs/sdk` | `SDK_VERSION`、`capabilities()`、`assertSdkCompatible()` |
| `@icqqjs/sdk/gateway` | 账号配置读写、路径约定、daemon 生命周期、`IpcClient` |
| `@icqqjs/sdk/daemon` | supervisor（spawn/stop/janitor）、完整账号路径 |
| `@icqqjs/sdk/protocol` | IPC/RPC 协议类型、`IpcClient`、`LoginActions` |
| `@icqqjs/sdk/bot` | MCP action 发现与校验 |

### `@icqqjs/sdk/gateway`

```typescript
import {
  loadConfig,
  saveConfig,
  getAccountConfig,
  setAccountConfig,
  getIcqqHome,
  getAccountDir,
  getLogPath,
  spawnDaemon,
  stopDaemon,
  isDaemonRunning,
  IpcClient,
  LoginActions,
} from "@icqqjs/sdk/gateway";
import type { AccountConfig, IcqqConfig } from "@icqqjs/sdk/gateway";
```

### `@icqqjs/sdk/daemon`

```typescript
import {
  spawnDaemon,
  stopDaemon,
  forceStopDaemon,
  isDaemonRunning,
  getDaemonPid,
  janitorStaleDaemonArtifacts,
  getIcqqHome,
  getSocketPath,
  getTokenPath,
  getPidPath,
} from "@icqqjs/sdk/daemon";
```

### `@icqqjs/sdk/protocol`

```typescript
import { IpcClient, LoginActions } from "@icqqjs/sdk/protocol";
import type { IpcRequest, IpcResponse, IpcEvent, IpcMessage } from "@icqqjs/sdk/protocol";

const client = await IpcClient.connectByUin(123456789);
const resp = await client.request("list_friends");
client.close();
```

### `@icqqjs/sdk/bot`

```typescript
import { listMcpDiscoverableActions, validateMcpAction } from "@icqqjs/sdk/bot";
```

## 能力检查

```typescript
import {
  SDK_VERSION,
  capabilities,
  assertSdkCompatible,
} from "@icqqjs/sdk";

console.log(SDK_VERSION);       // 当前 SDK 版本
console.log(capabilities());    // 运行时能力列表

// 仅校验能力字符串是否存在，不做 semver 范围比较
assertSdkCompatible({
  capabilities: ["ipc.client", "daemon.lifecycle"],
});
```

当前能力常量包括：`account.config`、`account.paths`、`daemon.lifecycle`、`daemon.login`、`ipc.client`、`rpc.client`、`mcp.contract`。

## 依赖边界

- **允许**：`import "@icqqjs/sdk"` 及其子路径。
- **禁止**：`import "@icqqjs/cli/..."`（内部实现，无稳定 semver 保证）。
- SDK 在构建时将 `@icqqjs/cli` 标为 external，发布到 npm 后由消费者安装 `@icqqjs/cli` 作为传递依赖。

## 开发

```bash
pnpm --filter @icqqjs/sdk typecheck
pnpm --filter @icqqjs/sdk test
pnpm --filter @icqqjs/sdk build
```

仓库根目录：[icqqjs/packages](https://github.com/icqqjs/packages)。CLI 主文档见 [`packages/cli/README.md`](../cli/README.md)。

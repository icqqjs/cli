# @icqqjs/gateway

多用户、多 Bot 的 icqq 网关：用户隔离、主机（本机/远程）管理、集中 MCP/RPC 与 Web 控制面。

主 CLI（`icqq`）**不再**提供 `gateway` 子命令，请使用独立 CLI **`icqq-gateway`**。

## 安装

```bash
npm install -g @icqqjs/gateway
```

monorepo 内开发（须先构建依赖链）：

```bash
pnpm install
pnpm build    # 含 @icqqjs/cli → @icqqjs/sdk → @icqqjs/gateway
pnpm exec icqq-gateway --help
```

要求 Node.js >= 22。

## 快速开始

```bash
# 1. 初始化（默认监听 127.0.0.1:8787，管理员用户名为 OS 用户名）
icqq-gateway init --migrate

# 2. 安装为系统服务（launchd / systemd）并启动
icqq-gateway service install

# 3. 浏览器打开控制面
open http://127.0.0.1:8787
```

`init` 行为要点：

- 数据写入 `~/.icqq-gateway/`（与 bot 运行时 `~/.icqq` **分离**）。
- 未提供 `-P` 时自动生成初始密码并打印（**仅显示一次**），首次登录强制改密。
- 默认 API Token 仅显示一次；注册默认关闭。
- `--migrate` 读取 `~/.icqq` 已有账号并登记为实例。

## CLI 命令

```bash
icqq-gateway init [选项]              # 初始化 SQLite、管理员、本机 host
icqq-gateway start                    # 前台运行（调试用）
icqq-gateway service install            # 安装并启动系统服务
icqq-gateway service status|stop|uninstall
icqq-gateway host approve <主控URL> <配对码>   # 远程主机配对
```

### `init` 常用选项

| 选项 | 说明 |
|------|------|
| `-U, --username` | 管理员用户名（默认 OS 用户名） |
| `-P, --password` | 密码（省略则自动生成） |
| `--host` / `--port` | 监听地址与端口（默认 `127.0.0.1:8787`） |
| `--migrate` | 迁移本地 `~/.icqq` 账号 |
| `--master-key` | 主密钥（生产环境推荐） |
| `--registration-enabled` | 开启自助注册（默认关闭） |

### 远程主机配对

主控 Web「添加远程主机」获取配对码后，在远程机器执行：

```bash
icqq-gateway host approve http://主控IP:8787 <配对码>
# 可选：--remote-base http://本机公网IP:8787 --name "我的 VPS"
```

或由远程管理员登录后访问 `/pair` 页面提交。

## 架构与数据目录

| 范围 | 路径 | 内容 |
|------|------|------|
| icqq 运行时 | `~/.icqq` | 账号配置、daemon socket/token、日志 |
| gateway 自有 | `~/.icqq-gateway` | SQLite、主密钥、session、配对与 host token |

主密钥优先级：`--master-key` > 环境变量 `GATEWAY_MASTER_KEY` > `~/.icqq-gateway/gateway.key`（本地可自动生成，**生产禁止**依赖自动生成）。

集成边界：gateway **仅**依赖 `@icqqjs/sdk/*`，不直接引用 `@icqqjs/cli` 内部模块。详见 [`packages/sdk/README.md`](../sdk/README.md)。

## 功能概览

- **用户隔离**：每个用户仅见自己的主机、实例与 API 密钥。
- **主机模型**：本机 host 与远程 host；远程默认不暴露数据面，可在主机设置开启 `proxy_data_plane` 由主控代理 MCP/RPC。
- **统一路由**：`POST /:uin/mcp`、`WS /:uin/rpc`（Bearer API Token 鉴权）。
- **Web 控制面**：实例管理、远程 Shell、登录向导、文档页（`/docs`）。

## 接入示例

### MCP（HTTP）

```bash
curl -X POST http://127.0.0.1:8787/123456789/mcp \
  -H "Authorization: Bearer <API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### RPC（WebSocket）

```typescript
const ws = new WebSocket("ws://127.0.0.1:8787/123456789/rpc?token=<API_TOKEN>");
ws.onopen = () =>
  ws.send(JSON.stringify({ id: "1", action: "list_friends", params: {} }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## 编程 API（库入口）

`@icqqjs/gateway` 同时导出运行时与初始化 API，供集成或测试使用：

```typescript
import {
  runGatewayInit,
  startGateway,
  GatewayStore,
  installGatewayService,
  getGatewayDbPath,
} from "@icqqjs/gateway";
```

## 开发

```bash
pnpm --filter @icqqjs/gateway typecheck
pnpm --filter @icqqjs/gateway test
pnpm --filter @icqqjs/gateway build   # tsdown + next build
pnpm --filter @icqqjs/gateway dev     # tsx watch 前台入口
```

环境变量 `GATEWAY_HOME` 可覆盖默认数据目录（测试用）。

仓库根目录：[icqqjs/packages](https://github.com/icqqjs/packages)。更完整的 gateway 说明亦见 [`packages/cli/README.md`](../cli/README.md) 中的 Gateway 章节。

# ADR-0004: MCP Layer Collapse

## Status

Accepted

## Context

MCP 调用链分散在 `invoke-action.ts`、`action-contract.ts`、`action-meta.ts`（blocked 列表）与 `host.ts` 等多文件，入口不统一。

## Decision

- `src/mcp/policy.ts` — `MCP_BLOCKED_ACTIONS`、`validateMcpAction`、`listMcpDiscoverableActions`
- `src/mcp/server.ts` — 统一 re-export：`McpHost`、`createMcpServer`、exposure 工具、`invokeMcpAction`
- 删除 `invoke-action.ts`；`action-meta.ts` 从 policy re-export blocked 列表

## Consequences

- 守护进程 `entry.ts` 从 `@/mcp/server.js` 引入 `McpHost`
- 测试从 `server.ts` / `policy.ts` 导入；新增 `tests/mcp-host.test.ts` 覆盖 HTTP 鉴权与 policy

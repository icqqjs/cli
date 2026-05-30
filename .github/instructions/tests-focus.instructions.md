---
description: "Use when adding/changing behavior, fixing bugs, or refactoring TypeScript in this repo. Enforce test-first mindset with Vitest, focused assertions, and cleanup for fs/env/socket side effects."
applyTo: "tests/**/*.test.ts"
---
# Tests Focus (Vitest)

- 默认把测试视为变更的一部分：行为变更应同时更新或新增 `tests/*.test.ts`。
- 使用 `vitest` 原生 API：`describe/it/expect`，并在需要时使用 `beforeEach/afterEach/vi`。
- 优先验证可观察行为，不绑死实现细节；每个用例名称直接描述一个行为结果。
- 每个模块至少覆盖：
  - 成功路径（happy path）
  - 参数错误或非法输入
  - 关键失败路径（例如认证失败、未找到、被拦截）
- 对 I/O 与外部依赖做隔离：
  - `node:fs/promises`、`node:child_process` 等依赖优先 `vi.mock(...)`
  - 仅在必要的集成场景使用临时目录/真实 socket，并在测试结束后清理
- 有副作用时必须清理：
  - 环境变量恢复
  - 临时文件/目录删除
  - socket/server 关闭
  - mock 状态重置（`vi.clearAllMocks()` / `vi.restoreAllMocks()`）
- 断言要具体：
  - 错误分支断言错误语义（如“禁止”“未知”“认证失败”）
  - 结构化结果使用 `toEqual`，布尔/存在性使用 `toBe` / `toHaveProperty`
- 避免把多个行为塞进一个 `it`；更倾向小而清晰的单一断言场景。
- 除非输出格式本身是产品契约，否则不要引入 snapshot 测试。

## 快速模式

- 新功能：先写失败用例，再补实现，最后重构。
- Bug 修复：先写可复现 bug 的回归测试，再改实现，确保测试先红后绿。
- 重构：先锁定旧行为测试，再改代码，避免语义漂移。

参考示例：
- `tests/config.test.ts`
- `tests/discover-icqq.test.ts`
- `tests/mcp-invoke.test.ts`
- `tests/rpc.test.ts`
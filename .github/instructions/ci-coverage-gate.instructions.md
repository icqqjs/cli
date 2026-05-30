---
description: "Use when editing CI workflow, Vitest config, or package scripts for test quality gates. Enforce coverage checks and fail-fast policy in this repository."
applyTo:
  - ".github/workflows/*.yml"
  - "vitest.config.ts"
  - "package.json"
---
# CI Coverage Gate

- 当任务涉及 CI 或测试门禁时，默认将覆盖率检查纳入流水线，而不是只跑 `pnpm test`。
- 采用单一入口脚本（建议 `pnpm test:coverage`）供本地与 CI 共享，避免命令漂移。
- 覆盖率阈值与 `coverage-threshold.instructions.md` 保持一致；不要在多个位置定义冲突阈值。
- 覆盖率不达标时 CI 必须失败（fail-fast），不要静默放行。

## 推荐实现顺序

1. 在 `vitest.config.ts` 启用 `test.coverage` 与 `thresholds`。
2. 在 `package.json` 增加 `test:coverage` 脚本。
3. 在 `.github/workflows/ci.yml` 中执行覆盖率命令并作为必过步骤。

## 例外策略

- 仅在明确说明原因时允许临时豁免，并要求附带后续补测跟踪项。
- 禁止长期保留无截止日期的 coverage 豁免。

## 审查要点

- 门禁是否同时覆盖 push 与 pull_request。
- 阈值是否与仓库既有策略一致。
- 失败日志是否能直接定位缺口（如 branch coverage 明显不足的模块）。
---
description: "Use when adding or modifying tests, discussing quality gates, or preparing CI changes. Define coverage thresholds and a strict exception process for Vitest in this repository."
applyTo: "tests/**/*.test.ts"
---
# Coverage Threshold Policy

目标：避免“有测试但保护不足”。在新增/修改行为时，优先保证关键路径被覆盖，而不是只追求通过。

## 推荐阈值（默认目标）

- statements >= 85%
- branches >= 75%
- functions >= 85%
- lines >= 85%

这些阈值用于指导测试设计与评审，不要求在每次小改动中一次性拉满全仓库覆盖率。

## 阶段化落地

- 短期：在 `vitest.config.ts` 先设置“基线防回退阈值”（当前仓库可通过的下限），避免覆盖率倒退。
- 中期：按模块补测后逐步提高阈值，直到逼近默认目标。
- 长期：将默认目标作为 CI 硬门禁。

## PR 级执行规则

- 若变更引入新模块或新分支逻辑：必须新增对应测试。
- 若变更修复 bug：必须附带可复现该 bug 的回归测试。
- 若仅重构：至少保持原有关键行为测试不退化。
- 若无法为某分支补测（外部依赖/环境限制）：在 PR 描述中写明原因与后续补测计划。

## 例外流程（严格）

只有满足下列任一条件才允许临时低于目标阈值：

- 依赖第三方系统，当前测试环境无法稳定复现。
- 涉及平台特性（如 OS/终端差异）且缺乏可靠模拟。
- 遗留代码技术债，当前改动范围不足以安全补测。

出现例外时必须同时提供：

- 覆盖缺口说明（缺的是什么路径）
- 风险评估（对用户/系统影响）
- 跟踪项（issue 或后续任务）

## 代理执行建议

- 写测试前先列出本次改动的“关键行为清单”，逐条映射到测试用例。
- 优先补“分支差异最大”的路径（错误处理、鉴权失败、边界输入）。
- 不要用 snapshot 掩盖行为断言，断言要指向具体语义。

## 后续落地（当用户明确要求）

如需把本策略升级为硬门禁，再执行以下改造：

- 在 `vitest.config.ts` 中增加 `test.coverage.thresholds`
- 在 `package.json` 增加 `test:coverage` 脚本
- 在 `.github/workflows/ci.yml` 将 `pnpm test` 扩展为覆盖率检查流程
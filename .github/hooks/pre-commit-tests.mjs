#!/usr/bin/env node

let input = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  let payload;
  try {
    payload = input.trim() ? JSON.parse(input) : {};
  } catch {
    process.exit(0);
  }

  const raw = JSON.stringify(payload).toLowerCase();

  const isTerminalTool =
    raw.includes("run_in_terminal") ||
    raw.includes("send_to_terminal") ||
    raw.includes("terminal");

  if (!isTerminalTool) {
    process.exit(0);
  }

  const committing = /\bgit\s+commit\b/.test(raw);
  const pushing = /\bgit\s+push\b/.test(raw);
  if (!committing && !pushing) {
    process.exit(0);
  }

  const result = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason:
        "Before git commit/push, run: pnpm typecheck && pnpm test",
    },
    systemMessage:
      "Quality gate: run pnpm typecheck && pnpm test before commit/push.",
  };

  process.stdout.write(JSON.stringify(result));
});
import Pastel from "pastel";
import { createRequire } from "node:module";

// Extract global --version / -V flag
if (process.argv.includes("--version") || process.argv.includes("-V")) {
  const require = createRequire(import.meta.url);
  const { version } = require("../package.json") as { version: string };
  console.log(version);
  process.exit(0);
}

// Extract global -u / --uin flag before Pastel processes args
const uIdx = process.argv.findIndex((a) => a === "-u" || a === "--uin");
if (uIdx !== -1 && process.argv[uIdx + 1]) {
  process.env.ICQQ_CURRENT_UIN = process.argv[uIdx + 1];
  process.argv.splice(uIdx, 2);
}

// Extract global --json flag
const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx !== -1) {
  process.env.ICQQ_JSON_OUTPUT = "1";
  process.argv.splice(jsonIdx, 1);
}

const app = new Pastel({
  importMeta: import.meta,
  name: "icqq",
  description: "基于 icqq 的命令行 QQ 客户端",
});

await app.run();

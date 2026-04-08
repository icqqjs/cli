import Pastel from "pastel";

// Extract global -u / --uin flag before Pastel processes args
const uIdx = process.argv.findIndex((a) => a === "-u" || a === "--uin");
if (uIdx !== -1 && process.argv[uIdx + 1]) {
  process.env.ICQQ_CURRENT_UIN = process.argv[uIdx + 1];
  process.argv.splice(uIdx, 2);
}

const app = new Pastel({
  importMeta: import.meta,
  name: "icqq",
  description: "基于 icqq 的命令行 QQ 客户端",
});

await app.run();

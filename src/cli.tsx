import Pastel from "pastel";

const app = new Pastel({
  importMeta: import.meta,
  name: "icqq",
  description: "基于 icqq 的命令行 QQ 客户端",
});

await app.run();

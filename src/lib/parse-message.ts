/**
 * CQ 码消息解析与编码。
 *
 * 支持的标记：
 *   [face:id]          QQ 表情
 *   [image:路径或URL]   图片
 *   [at:QQ号]          @某人
 *   [at:all]           @全体
 *   [dice]             骰子
 *   [rps]              猜拳
 *
 * parseMessage: 文本 → Sendable
 * stringifyMessage: MessageElem[] → CQ 码文本
 */

import type { MessageElem } from "@icqqjs/icqq";
import fs from "node:fs";
import path from "node:path";

const TAG_RE = /\[(face|image|at|dice|rps)(?::([^\]]*))?\]/g;

/** Check if a string is a local file path (not a URL or base64) */
function isLocalPath(str: string): boolean {
  if (!str) return false;
  if (str.startsWith("http://") || str.startsWith("https://")) return false;
  if (str.startsWith("base64://")) return false;
  return true;
}

/** Read a local file and return a base64:// data URI */
function fileToBase64(filePath: string): string {
  const resolved = path.resolve(filePath);
  const buf = fs.readFileSync(resolved);
  return "base64://" + buf.toString("base64");
}

export function parseMessage(raw: string): string | (string | MessageElem)[] {
  const parts: (string | MessageElem)[] = [];
  let last = 0;

  for (const m of raw.matchAll(TAG_RE)) {
    const before = raw.slice(last, m.index);
    if (before) parts.push(before);

    const [, tag, value] = m;

    switch (tag) {
      case "face":
        parts.push({ type: "face", id: Number(value) });
        break;
      case "image":
        parts.push({
          type: "image",
          file: isLocalPath(value!) ? fileToBase64(value!) : value!,
        });
        break;
      case "at":
        parts.push({
          type: "at",
          qq: value === "all" ? "all" : Number(value),
        } as MessageElem);
        break;
      case "dice":
        parts.push({ type: "dice" } as MessageElem);
        break;
      case "rps":
        parts.push({ type: "rps" } as MessageElem);
        break;
    }

    last = m.index! + m[0].length;
  }

  const tail = raw.slice(last);
  if (tail) parts.push(tail);

  // 纯文本不包装
  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0];
  }
  return parts.length === 0 ? raw : parts;
}

/** 将 icqq 的 MessageElem 数组编码为 CQ 码文本 */
export function stringifyMessage(elems: MessageElem[]): string {
  return elems
    .map((e) => {
      switch (e.type) {
        case "text":
          return e.text;
        case "face":
        case "sface":
          return `[face:${e.id}]`;
        case "at":
          return `[at:${e.qq}]`;
        case "image":
          return `[image:${e.url ?? e.file}]`;
        case "flash":
          return `[flash:${(e as any).url ?? (e as any).file}]`;
        case "record":
          return `[record:${(e as any).url ?? (e as any).file}]`;
        case "video":
          return `[video:${(e as any).url ?? (e as any).file}]`;
        case "rps":
          return `[rps]`;
        case "dice":
          return `[dice]`;
        case "bface":
          return `[bface:${e.text}]`;
        case "share":
          return `[share:${e.url}]`;
        case "location":
          return `[location:${e.lat},${e.lng},${e.address}]`;
        case "poke":
          return `[poke:${e.id}]`;
        case "json":
          return `[json]`;
        case "xml":
          return `[xml]`;
        case "file":
          return `[file:${e.name ?? e.fid}]`;
        case "markdown":
          return `[markdown]`;
        default:
          return `[${e.type}]`;
      }
    })
    .join("");
}

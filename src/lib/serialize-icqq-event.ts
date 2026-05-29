/**
 * 将 icqq 事件对象序列化为可 JSON 传输的 plain object。
 * 优先调用 icqq 自带的 toJSON(keys)，排除内部协议字段与 Client/Group 等类实例。
 */

/** icqq Message / 事件对象 toJSON 时需排除的键 */
export const ICQQ_EVENT_JSON_OMIT_KEYS = [
  "client",
  "proto",
  "parsed",
  "info",
  "head",
  "frag",
  "body",
  "friend",
  "group",
  "member",
  "discuss",
] as const;

type JsonOmitKey = (typeof ICQQ_EVENT_JSON_OMIT_KEYS)[number];

function hasIcqqToJSON(
  value: object,
): value is { toJSON: (keys: string[]) => Record<string, unknown> } {
  return typeof (value as { toJSON?: unknown }).toJSON === "function";
}

function toPlainEvent(event: unknown, seen = new WeakSet<object>()): unknown {
  if (event === null || event === undefined) return event;
  if (typeof event === "bigint") return event.toString();
  if (typeof event !== "object") return event;

  if (Buffer.isBuffer(event)) {
    return { type: "Buffer", data: event.toString("base64") };
  }

  if (Array.isArray(event)) {
    return event.map((item) => toPlainEvent(item, seen));
  }

  if (seen.has(event)) return undefined;
  seen.add(event);

  if (hasIcqqToJSON(event)) {
    return toPlainEvent(event.toJSON([...ICQQ_EVENT_JSON_OMIT_KEYS]), seen);
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (typeof value === "function") continue;
    if (ICQQ_EVENT_JSON_OMIT_KEYS.includes(key as JsonOmitKey)) continue;
    out[key] = toPlainEvent(value, seen);
  }
  return out;
}

/** 序列化 icqq 事件，供 IPC / Webhook JSON 传输使用 */
export function serializeIcqqEvent(event: unknown): unknown {
  return toPlainEvent(event);
}

/** JSON.stringify replacer，配合 serializeIcqqEvent 兜底 BigInt / Buffer */
export function icqqEventJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) {
    return { type: "Buffer", data: value.toString("base64") };
  }
  return value;
}

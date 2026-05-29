import { describe, expect, it } from "vitest";
import {
  ICQQ_EVENT_JSON_OMIT_KEYS,
  serializeIcqqEvent,
} from "../src/lib/serialize-icqq-event.js";

describe("serializeIcqqEvent", () => {
  it("uses icqq toJSON and omits internal keys", () => {
    const event = {
      post_type: "message",
      message_type: "group",
      group_id: 123,
      user_id: 456,
      raw_message: "hello",
      time: 1_700_000_000,
      msg_id: 999n,
      client: { uin: 10001 },
      proto: { encoded: true },
      friend: { pickMember: () => null },
      reply() {
        return Promise.resolve({});
      },
      toJSON(keys: string[]) {
        return Object.fromEntries(
          Object.entries(this).filter(
            ([key, value]) =>
              typeof value !== "function" && !keys.includes(key),
          ),
        );
      },
    };

    const data = serializeIcqqEvent(event) as Record<string, unknown>;
    expect(data.post_type).toBe("message");
    expect(data.message_type).toBe("group");
    expect(data.group_id).toBe(123);
    expect(data.raw_message).toBe("hello");
    expect(data.msg_id).toBe("999");
    expect(data.client).toBeUndefined();
    expect(data.proto).toBeUndefined();
    expect(data.friend).toBeUndefined();
    expect(data.reply).toBeUndefined();
  });

  it("walks plain objects when toJSON is absent", () => {
    const event = {
      post_type: "message",
      detail_type: "guild",
      guild_id: "g1",
      channel_id: "c1",
      sender: { nickname: "n", tiny_id: "t1" },
      raw_message: "hi",
      proto: { hidden: true },
      reply() {
        return Promise.resolve({});
      },
    };

    const data = serializeIcqqEvent(event) as Record<string, unknown>;
    expect(data.guild_id).toBe("g1");
    expect(data.sender).toEqual({ nickname: "n", tiny_id: "t1" });
    expect(data.raw_message).toBe("hi");
    expect((data as Record<string, unknown>).proto).toBeUndefined();
  });

  it("documents omit keys aligned with icqq Message internals", () => {
    expect(ICQQ_EVENT_JSON_OMIT_KEYS).toContain("client");
    expect(ICQQ_EVENT_JSON_OMIT_KEYS).toContain("proto");
    expect(ICQQ_EVENT_JSON_OMIT_KEYS).toContain("group");
  });
});

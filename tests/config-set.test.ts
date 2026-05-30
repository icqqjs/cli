import { describe, it, expect } from "vitest";
import {
  applyConfigSet,
  parseConfigSetValue,
  isConfigSetKey,
} from "../src/lib/config-set.js";
import type { IcqqConfig } from "../src/lib/config.js";

describe("config-set", () => {
  it("parses mcp.enabled", () => {
    expect(parseConfigSetValue("mcp.enabled", "true")).toBe(true);
    expect(parseConfigSetValue("rpc.enabled", "0")).toBe(false);
    expect(isConfigSetKey("mcp.enabled")).toBe(true);
  });

  it("parses number and string keys", () => {
    expect(parseConfigSetValue("currentUin", "12345")).toBe(12345);
    expect(parseConfigSetValue("mcp.http.port", "3920")).toBe(3920);
    expect(parseConfigSetValue("rpc.port", "9100")).toBe(9100);
    expect(parseConfigSetValue("webhookUrl", "https://example.com")).toBe(
      "https://example.com",
    );
    expect(parseConfigSetValue("rpc.host", "0.0.0.0")).toBe("0.0.0.0");
  });

  it("rejects invalid bool, port, and uin", () => {
    expect(() => parseConfigSetValue("notifyEnabled", "yes")).toThrow("布尔值必须");
    expect(() => parseConfigSetValue("mcp.http.port", "70000")).toThrow("端口必须");
    expect(() => parseConfigSetValue("currentUin", "0")).toThrow("currentUin 必须为正整数");
  });

  it("applies nested mcp.http.port", () => {
    const config: IcqqConfig = { accounts: {} };
    applyConfigSet(config, "mcp.http.port", 3920);
    expect(config.mcp?.http?.port).toBe(3920);
  });

  it("applies all top-level and nested config keys", () => {
    const config: IcqqConfig = { accounts: {} };

    applyConfigSet(config, "currentUin", 12345);
    applyConfigSet(config, "webhookUrl", "https://example.com/hook");
    applyConfigSet(config, "notifyEnabled", true);
    applyConfigSet(config, "mcp.enabled", true);
    applyConfigSet(config, "mcp.http.host", "0.0.0.0");
    applyConfigSet(config, "mcp.http.token", "secret");
    applyConfigSet(config, "rpc.enabled", true);
    applyConfigSet(config, "rpc.host", "0.0.0.0");
    applyConfigSet(config, "rpc.port", 9100);

    expect(config.currentUin).toBe(12345);
    expect(config.webhookUrl).toBe("https://example.com/hook");
    expect(config.notifyEnabled).toBe(true);
    expect(config.mcp).toEqual({
      enabled: true,
      http: {
        host: "0.0.0.0",
        port: 0,
        token: "secret",
      },
    });
    expect(config.rpc).toEqual({
      enabled: true,
      host: "0.0.0.0",
      port: 9100,
    });
  });

  it("recognizes only supported keys", () => {
    expect(isConfigSetKey("rpc.port")).toBe(true);
    expect(isConfigSetKey("accounts")).toBe(false);
  });
});

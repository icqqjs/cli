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
    expect(isConfigSetKey("mcp.enabled")).toBe(true);
  });

  it("applies nested mcp.http.port", () => {
    const config: IcqqConfig = { accounts: {} };
    applyConfigSet(config, "mcp.http.port", 3920);
    expect(config.mcp?.http?.port).toBe(3920);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises before importing config
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

import fs from "node:fs/promises";
import { loadConfig, getAccountConfig, setAccountConfig } from "../src/lib/config.ts";

describe("loadConfig", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default config when file does not exist", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    const config = await loadConfig();
    expect(config).toEqual({ accounts: {} });
  });

  it("parses valid config", async () => {
    const data = JSON.stringify({
      currentUin: 12345,
      accounts: { "12345": { platform: 2, signApiUrl: "https://sign.example.com" } },
    });
    vi.mocked(fs.readFile).mockResolvedValue(data);
    const config = await loadConfig();
    expect(config.currentUin).toBe(12345);
    expect(config.accounts["12345"].platform).toBe(2);
  });

  it("migrates defaultUin to currentUin", async () => {
    const data = JSON.stringify({
      defaultUin: 99999,
      accounts: {},
    });
    vi.mocked(fs.readFile).mockResolvedValue(data);
    const config = await loadConfig();
    expect(config.currentUin).toBe(99999);
    expect((config as any).defaultUin).toBeUndefined();
  });

  it("prefers currentUin over defaultUin", async () => {
    const data = JSON.stringify({
      defaultUin: 11111,
      currentUin: 22222,
      accounts: {},
    });
    vi.mocked(fs.readFile).mockResolvedValue(data);
    const config = await loadConfig();
    expect(config.currentUin).toBe(22222);
  });
});

describe("getAccountConfig", () => {
  it("returns account config for existing uin", () => {
    const config = {
      currentUin: 123,
      accounts: { "123": { platform: 2, signApiUrl: "https://sign.example.com" } },
    };
    expect(getAccountConfig(config, 123)).toEqual({ platform: 2, signApiUrl: "https://sign.example.com" });
  });

  it("returns undefined for missing uin", () => {
    const config = { accounts: {} };
    expect(getAccountConfig(config, 999)).toBeUndefined();
  });
});

describe("setAccountConfig", () => {
  it("sets account config", () => {
    const config = { accounts: {} as Record<string, any> };
    setAccountConfig(config, 123, { platform: 3, signApiUrl: "https://sign.test" });
    expect(config.accounts["123"]).toEqual({ platform: 3, signApiUrl: "https://sign.test" });
  });
});

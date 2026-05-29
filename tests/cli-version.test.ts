import { describe, expect, it } from "vitest";
import { isVersionArgv } from "../src/lib/cli-version.js";

describe("isVersionArgv", () => {
  it("matches -v, -V, --version", () => {
    expect(isVersionArgv(["node", "icqq", "-v"])).toBe(true);
    expect(isVersionArgv(["node", "icqq", "-V"])).toBe(true);
    expect(isVersionArgv(["node", "icqq", "--version"])).toBe(true);
  });

  it("ignores other flags", () => {
    expect(isVersionArgv(["node", "icqq", "help"])).toBe(false);
    expect(isVersionArgv(["node", "icqq", "--verbose"])).toBe(false);
  });
});

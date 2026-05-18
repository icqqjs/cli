import { describe, it, expect, vi, beforeEach } from "vitest";
import { Actions } from "../src/daemon/protocol.js";
import { MCP_BLOCKED_ACTIONS } from "../src/daemon/action-meta.js";
import { validateAction, invokeAction } from "../src/mcp/invoke-action.js";

vi.mock("../src/daemon/handlers.js", () => ({
  handleRequest: vi.fn(),
}));

import { handleRequest } from "../src/daemon/handlers.js";

const mockClient = {} as import("@icqqjs/icqq").Client;

describe("validateAction", () => {
  it("rejects logout", () => {
    expect(validateAction(Actions.LOGOUT)).toMatch(/禁止/);
    expect(MCP_BLOCKED_ACTIONS.has(Actions.LOGOUT)).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(validateAction("not_a_real_action")).toMatch(/未知/);
  });

  it("accepts send_private_msg", () => {
    expect(validateAction(Actions.SEND_PRIVATE_MSG)).toBeNull();
  });
});

describe("invokeAction", () => {
  beforeEach(() => {
    vi.mocked(handleRequest).mockReset();
  });

  it("returns data on success", async () => {
    vi.mocked(handleRequest).mockResolvedValue({
      id: "1",
      ok: true,
      data: { message_id: "abc" },
    });
    const result = await invokeAction(mockClient, Actions.SEND_PRIVATE_MSG, {
      user_id: 1,
      message: "hi",
    });
    expect(result).toEqual({ ok: true, data: { message_id: "abc" } });
  });

  it("returns error from handler", async () => {
    vi.mocked(handleRequest).mockResolvedValue({
      id: "1",
      ok: false,
      error: "失败",
    });
    const result = await invokeAction(mockClient, Actions.PING, {});
    expect(result).toEqual({ ok: false, error: "失败" });
  });

  it("blocks logout without calling handler", async () => {
    const result = await invokeAction(mockClient, Actions.LOGOUT, {});
    expect(result.ok).toBe(false);
    expect(handleRequest).not.toHaveBeenCalled();
  });
});

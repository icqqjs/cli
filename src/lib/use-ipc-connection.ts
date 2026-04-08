import { useState, useEffect } from "react";
import { IpcClient } from "./ipc-client.js";
import { resolveUin } from "./config.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";

/**
 * Connect to the daemon IPC. Returns { ipc, error }.
 * Caller is responsible for closing the IpcClient when done.
 */
export function useIpcConnection(): {
  ipc: IpcClient | null;
  error: string;
  uin: number | null;
} {
  const [ipc, setIpc] = useState<IpcClient | null>(null);
  const [error, setError] = useState("");
  const [uin, setUin] = useState<number | null>(null);

  useEffect(() => {
    let closed = false;
    let client: IpcClient | null = null;

    void (async () => {
      try {
        const uin = await resolveUin();
        if (!closed) setUin(uin);
        if (!(await isDaemonRunning(uin)))
          throw new Error(
            "守护进程未运行\n  请先运行: icqq login",
          );
        client = await IpcClient.connect(uin);
        if (!closed) setIpc(client);
        else client.close();
      } catch (e) {
        if (!closed) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      closed = true;
      // Don't auto-close here; caller decides when to close
    };
  }, []);

  return { ipc, error, uin };
}

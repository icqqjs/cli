import { useState, useEffect } from "react";
import { IpcClient } from "./ipc-client.js";
import { resolveUin } from "./config.js";
import { isDaemonRunning } from "@/daemon/lifecycle.js";

export function useIpcRequest(
  action: string,
  params: Record<string, unknown> = {},
): {
  loading: boolean;
  data: unknown;
  error: string;
  uin: number | null;
} {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [uin, setUin] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const resolvedUin = await resolveUin();
        if (!cancelled) setUin(resolvedUin);
        if (!(await isDaemonRunning(resolvedUin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const ipc = await IpcClient.connect(resolvedUin);
        const resp = await ipc.request(action, params);
        ipc.close();

        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        if (!cancelled) setData(resp.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, JSON.stringify(params)]);

  return { loading, data, error, uin };
}

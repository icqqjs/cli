import { useState, useEffect } from "react";
import { IpcClient } from "./ipc-client.js";
import { loadConfig } from "./config.js";
import { isDaemonRunning } from "../daemon/lifecycle.js";

export function useIpcRequest(
  action: string,
  params: Record<string, unknown> = {},
): {
  loading: boolean;
  data: unknown;
  error: string;
} {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");

        const ipc = await IpcClient.connect(uin);
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

  return { loading, data, error };
}

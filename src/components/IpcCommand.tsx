import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "./Spinner.js";
import { loadConfig } from "../lib/config.js";
import { IpcClient } from "../lib/ipc-client.js";
import { isDaemonRunning } from "../daemon/lifecycle.js";

type Props = {
  action: string;
  params?: Record<string, unknown>;
  render: (data: any) => React.ReactNode;
  loadingText?: string;
};

export function IpcCommand({ action, params, render, loadingText }: Props) {
  const { exit } = useApp();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadConfig();
        const uin = config.defaultUin;
        if (!uin) throw new Error("未找到已登录账号，请先执行 icqq login");
        if (!(await isDaemonRunning(uin)))
          throw new Error("守护进程未运行，请先执行 icqq login");
        const ipc = await IpcClient.connect(uin);
        const resp = await ipc.request(action, params ?? {});
        ipc.close();
        if (!resp.ok) throw new Error(resp.error ?? "请求失败");
        setData(resp.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => exit(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, exit]);

  if (loading) return <Spinner label={loadingText ?? "执行中…"} />;
  if (error) return <Text color="red">✖ {error}</Text>;

  return <>{render(data)}</>;
}

type MutateProps = {
  action: string;
  params?: Record<string, unknown>;
  successText: string;
  loadingText?: string;
};

export function IpcMutate({ action, params, successText, loadingText }: MutateProps) {
  return (
    <IpcCommand
      action={action}
      params={params}
      loadingText={loadingText}
      render={() => <Text color="green">✔ {successText}</Text>}
    />
  );
}

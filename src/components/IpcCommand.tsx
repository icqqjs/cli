import React, { useState, useEffect } from "react";
import { Text, useApp } from "ink";
import { Spinner } from "./Spinner.js";
import { useIpcConnection } from "@/lib/use-ipc-connection.js";

type Props = {
  action: string;
  params?: Record<string, unknown>;
  render: (data: any) => React.ReactNode;
  loadingText?: string;
};

export function IpcCommand({ action, params, render, loadingText }: Props) {
  const { exit } = useApp();
  const { ipc, error: connError, uin } = useIpcConnection();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ipc) return;

    void (async () => {
      try {
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
  }, [ipc]);

  useEffect(() => {
    if (!loading || connError) {
      const hasError = !!(connError || error);
      const timer = setTimeout(() => exit(), hasError ? 2000 : 100);
      return () => clearTimeout(timer);
    }
  }, [loading, connError, error, exit]);

  if (connError) return <Text color="red">✖ {connError}</Text>;
  if (loading) return <Spinner label={`${uin ? `[${uin}] ` : ""}${loadingText ?? "执行中…"}`} />;
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

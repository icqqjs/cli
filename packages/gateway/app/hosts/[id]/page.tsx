"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import useSWR from "swr";
import {
  createLocalOnHost,
  deleteInstance,
  fetcher,
  getInstanceStatus,
  listHosts,
  reloginInstance,
  setHostProxyDataPlane,
  syncHost,
  type Host,
  type Instance,
  type LoginStateView,
  type Me,
} from "../../lib/api";
import {
  AppDialog,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  ErrorText,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Spinner,
  Switch,
} from "../../components/ui";
import { TopBar } from "../../components/nav";
import { LoginFlowPanel } from "../../components/login-flow";

export default function HostDetailPage() {
  const params = useParams();
  const hostId = String(params.id);
  const { data: me, error } = useSWR<Me>("/api/me", fetcher, {
    shouldRetryOnError: false,
  });
  const { data: hosts, mutate: mutateHosts } = useSWR<Host[]>("/api/hosts", () =>
    listHosts(),
  );
  const host = hosts?.find((h) => h.id === hostId);
  const { data: instances, mutate } = useSWR<Instance[]>(
    "/api/instances",
    fetcher,
  );
  const hostInstances = (instances ?? []).filter((i) => i.host_id === hostId);
  const [syncing, setSyncing] = useState(false);

  if (error)
    return (
      <div className="grid min-h-dvh place-items-center p-8">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          去登录
        </Link>
      </div>
    );
  if (!me || !host)
    return (
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </main>
    );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-dvh">
      <TopBar
        right={
          <Link href="/hosts">
            <Button variant="ghost" size="sm">
              ← 返回主机列表
            </Button>
          </Link>
        }
      />
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-10">
        <PageHeader
          title={host.name}
          badges={
            <>
              {host.is_local && <Badge tone="brand">本机</Badge>}
              <HostStatusBadge status={host.status} />
            </>
          }
          description={
            <span className="font-mono text-xs">{host.base_url}</span>
          }
          actions={
            <>
              <Button
                variant="secondary"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  try {
                    await syncHost(hostId);
                    await mutate();
                  } finally {
                    setSyncing(false);
                  }
                }}
              >
                {syncing ? "同步中…" : "同步发现"}
              </Button>
              <AddLocalDialog hostId={hostId} onDone={() => void mutate()} />
              <Link href={`/hosts/${hostId}/shell`}>
                <Button variant="outline">打开 Shell</Button>
              </Link>
            </>
          }
        />

        {!host.is_local && (
          <Card className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">远程 MCP/RPC 数据面代理</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                默认关闭。开启后主控可代理访问该主机的 MCP 与 RPC 端点。
              </p>
            </div>
            <Switch
              label="远程 MCP/RPC 数据面代理"
              checked={Boolean(host.proxy_data_plane)}
              onChange={async (checked) => {
                await setHostProxyDataPlane(hostId, checked);
                await mutateHosts();
              }}
            />
          </Card>
        )}

        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">UIN</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">备注</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {hostInstances.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-[var(--border)] transition last:border-0 hover:surface-2"
                  >
                    <td className="px-5 py-3.5 font-mono tabular-nums">
                      {i.uin}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusCell instance={i} />
                    </td>
                    <td className="px-5 py-3.5 text-muted">{i.label ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {host.is_local && (
                          <>
                            <CopyButton
                              label="MCP"
                              value={`${origin}/${i.uin}/mcp`}
                            />
                            <CopyButton
                              label="RPC"
                              value={`${origin.replace(/^http/, "ws")}/${i.uin}/rpc`}
                            />
                          </>
                        )}
                        <ReloginDialog
                          instance={i}
                          onDone={() => void mutate()}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            if (!confirm(`删除实例 ${i.uin}？该操作不可撤销。`))
                              return;
                            await deleteInstance(i.id);
                            void mutate();
                          }}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {hostInstances.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="暂无 Bot 实例"
                        description="点击右上角「添加本地实例」创建，或「同步发现」拉取该主机上已有的账号。"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function HostStatusBadge({ status }: { status: Host["status"] }) {
  if (status === "online")
    return (
      <Badge tone="green" dot>
        在线
      </Badge>
    );
  if (status === "offline")
    return (
      <Badge tone="neutral" dot>
        离线
      </Badge>
    );
  return (
    <Badge tone="neutral" dot>
      未知
    </Badge>
  );
}

function StatusDot({ tone }: { tone: "green" | "amber" | "red" | "neutral" }) {
  const colors = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    neutral: "bg-[var(--text-muted)]",
  } as const;
  return (
    <span
      className={`inline-block size-1.5 rounded-full ${colors[tone]}`}
      aria-hidden
    />
  );
}

function StatusCell({ instance }: { instance: Instance }) {
  const { data } = useSWR<LoginStateView>(
    `status:${instance.id}`,
    () => getInstanceStatus(instance.id),
    { refreshInterval: 5000 },
  );
  if (!data)
    return (
      <span className="inline-flex items-center gap-2 text-muted">
        <Spinner className="size-3" /> 查询中
      </span>
    );
  if (data.state === "online")
    return (
      <span className="inline-flex items-center gap-2 text-emerald-600">
        <StatusDot tone="green" />
        在线{data.nickname ? ` · ${data.nickname}` : ""}
      </span>
    );
  if (data.state === "login_waiting")
    return (
      <span className="inline-flex items-center gap-2 text-amber-600">
        <StatusDot tone="amber" /> 登录中
      </span>
    );
  if (data.state === "daemon_down")
    return (
      <span className="inline-flex items-center gap-2 text-red-500">
        <StatusDot tone="red" /> daemon 异常
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 text-muted">
      <StatusDot tone="neutral" /> {data.state}
    </span>
  );
}

function ReloginDialog({
  instance,
  onDone,
}: {
  instance: Instance;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [err, setErr] = useState("");
  const [boot, setBoot] = useState<LoginStateView | null>(null);

  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm">
          恢复登录
        </Button>
      }
      title={`恢复登录 · ${instance.uin}`}
    >
      {!started ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            重新拉起 daemon；存在有效登录态时将自动恢复，否则进入验证流程。
          </p>
          {err && <ErrorText>{err}</ErrorText>}
          <Button
            className="w-full py-2.5"
            onClick={async () => {
              setErr("");
              try {
                const r = await reloginInstance(instance.id);
                setBoot(r);
                if (r.state === "daemon_down" || r.error) {
                  setErr(r.error ?? "daemon 启动失败");
                } else {
                  setStarted(true);
                }
              } catch (e) {
                setErr(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            开始恢复
          </Button>
          {boot?.logTail && (
            <pre className="max-h-40 overflow-auto rounded-lg surface-2 p-3 text-xs">
              {boot.logTail}
            </pre>
          )}
        </div>
      ) : (
        <LoginFlowPanel instanceId={instance.id} onOnline={onDone} />
      )}
    </AppDialog>
  );
}

function AddLocalDialog({
  hostId,
  onDone,
}: {
  hostId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [uin, setUin] = useState("");
  const [platform, setPlatform] = useState("1");
  const [label, setLabel] = useState("");
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [bootErr, setBootErr] = useState<LoginStateView | null>(null);

  const create = async () => {
    setErr("");
    setBootErr(null);
    try {
      const r = await createLocalOnHost(hostId, {
        uin: Number(uin),
        platform: Number(platform),
        label: label || undefined,
      });
      if (r.state === "daemon_down" || r.error) {
        setBootErr(r);
        setErr(r.error ?? "daemon 启动失败");
        return;
      }
      setInstanceId(r.id);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>添加本地实例</Button>}
      title="添加本地实例"
      description="填写要托管的 QQ 号，创建后将拉起 daemon 并进入登录向导。"
    >
      {!instanceId ? (
        <div className="space-y-4">
          <Field label="UIN">
            <Input
              placeholder="QQ 号"
              inputMode="numeric"
              value={uin}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setUin(e.target.value)
              }
            />
          </Field>
          <Field label="平台" hint="协议平台编号，通常为 1（安卓手机）。">
            <Input
              value={platform}
              inputMode="numeric"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPlatform(e.target.value)
              }
            />
          </Field>
          <Field label="备注（可选）">
            <Input
              placeholder="便于区分的名称"
              value={label}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLabel(e.target.value)
              }
            />
          </Field>
          {err && <ErrorText>{err}</ErrorText>}
          {bootErr?.logTail && (
            <pre className="max-h-40 overflow-auto rounded-lg surface-2 p-3 text-xs">
              {bootErr.logTail}
            </pre>
          )}
          <Button
            className="w-full py-2.5"
            onClick={() => void create()}
            disabled={!uin}
          >
            创建并登录
          </Button>
        </div>
      ) : (
        <LoginFlowPanel instanceId={instanceId} onOnline={onDone} />
      )}
    </AppDialog>
  );
}

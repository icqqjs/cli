"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  createPairing,
  deleteHost,
  fetcher,
  listHosts,
  logout,
  type Host,
  type Me,
} from "../lib/api";
import { CapabilityMarquee, FeatureBento } from "../components/feature-bento";
import { NavLink, TopBar } from "../components/nav";
import {
  AppDialog,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Skeleton,
} from "../components/ui";

export default function HostsPage() {
  const router = useRouter();
  const { data: me, error, mutate } = useSWR<Me>("/api/me", fetcher, {
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (me?.mustChangePassword) router.replace("/change-password");
  }, [me, router]);

  if (error)
    return (
      <main className="grid min-h-dvh w-full max-w-full place-items-center overflow-x-hidden p-6">
        <Card className="glass-pill w-full max-w-md space-y-4 rounded-3xl p-8 text-center">
          <p className="text-muted">请先登录以管理主机</p>
          <Link href="/">
            <Button className="w-full py-2.5">去登录</Button>
          </Link>
          <Link
            href="/register"
            className="block text-sm text-brand-600 hover:underline"
          >
            注册账号
          </Link>
        </Card>
      </main>
    );

  if (!me)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );

  return (
    <HostsView
      me={me}
      onLogout={() => {
        void mutate();
        router.push("/");
      }}
    />
  );
}

function HostsView({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const { data: hosts, mutate } = useSWR<Host[]>("/api/hosts", () =>
    listHosts(),
  );

  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <TopBar
        right={
          <>
            <NavLink href="/hosts">主机</NavLink>
            <NavLink href="/tokens">密钥</NavLink>
            <NavLink href="/docs">文档</NavLink>
            <span className="mx-1.5 hidden h-5 w-px bg-[var(--border)] sm:block" />
            <span
              className="hidden size-7 place-items-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-600 sm:grid"
              title={me.username}
            >
              {me.username.slice(0, 1).toUpperCase()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                onLogout();
              }}
            >
              退出
            </Button>
          </>
        }
      />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 md:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="page-title text-[var(--text)]">我的主机</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              每台主机可承载多个 Bot 实例。本机自动登记，远程主机通过配对码接入，一键同步发现。
            </p>
          </div>
          <AddRemoteDialog onDone={() => void mutate()} />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {!hosts && (
            <>
              <HostCardSkeleton />
              <HostCardSkeleton />
            </>
          )}
          {(hosts ?? []).map((h) => (
            <HostCard key={h.id} host={h} onDelete={() => void mutate()} />
          ))}
          {hosts && hosts.length === 0 && (
            <Card className="glass-pill col-span-full rounded-3xl" padded={false}>
              <EmptyState
                icon={
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="4" width="18" height="7" rx="2" />
                    <rect x="3" y="13" width="18" height="7" rx="2" />
                    <path d="M7 7.5h.01M7 16.5h.01" />
                  </svg>
                }
                title="还没有远程主机"
                description="点击「添加远程主机」生成配对码，在远程 gateway 上执行 approve 即可完成接入。"
                action={<AddRemoteDialog onDone={() => void mutate()} />}
              />
            </Card>
          )}
        </div>
      </section>

      <CapabilityMarquee />
      <FeatureBento />

      <footer className="border-t border-[var(--border)] py-28 md:py-36">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="display-title mx-auto max-w-5xl text-[var(--text)]">
            准备好扩展你的 Bot 舰队了吗？
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            配对一台远程 gateway，同步账号后，即可在同一控制台管理登录与 Shell。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <AddRemoteDialog
              onDone={() => void mutate()}
              triggerLabel="添加远程主机"
            />
            <Link href="/docs">
              <Button variant="secondary" size="lg">
                阅读文档
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HostCardSkeleton() {
  return (
    <Card padded={false} className="rounded-3xl p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </Card>
  );
}

function HostCard({
  host: h,
  onDelete,
}: {
  host: Host;
  onDelete: () => void;
}) {
  return (
    <Card
      padded={false}
      className="group glass-pill overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-600/10"
    >
      <div className="relative p-6">
        <div className="aurora absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-30" />
        <div className="relative space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {h.name}
                </h2>
                {h.is_local && <Badge tone="brand">本机</Badge>}
                <HostStatusBadge status={h.status} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-muted">
                <span className="truncate">{h.base_url}</span>
                <CopyButton value={h.base_url} label="" className="shrink-0 px-1" />
              </p>
            </div>
            {!h.is_local && (
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!confirm(`删除主机「${h.name}」？该操作不可撤销。`)) return;
                  await deleteHost(h.id);
                  onDelete();
                }}
              >
                删除
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
            <p className="text-sm text-muted">
              <span className="font-medium tabular-nums text-[var(--text)]">
                {h.instance_count}
              </span>{" "}
              个 Bot 实例
            </p>
            <div className="flex gap-2">
              <Link href={`/hosts/${h.id}`}>
                <Button size="sm">管理实例</Button>
              </Link>
              <Link href={`/hosts/${h.id}/shell`}>
                <Button variant="secondary" size="sm">
                  Shell
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
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

function AddRemoteDialog({
  onDone,
  triggerLabel = "添加远程主机",
}: {
  onDone: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pairing, setPairing] = useState<{
    code: string;
    master_url: string;
    expires_at: string;
  } | null>(null);

  const start = async () => {
    setPairing(await createPairing());
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void start();
        else setPairing(null);
      }}
      trigger={<Button size="lg">{triggerLabel}</Button>}
      title="配对远程主机"
      description="配对码短时有效。在远程机器完成 approve 后，回到主机列表点击「同步发现」。"
      wide
    >
      {pairing ? (
        <div className="space-y-4 text-sm">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <Step n={1} />
              <div className="min-w-0 flex-1">
                <p className="text-muted">
                  在远程机器执行（需已 init gateway）：
                </p>
                <code className="mt-1.5 block break-all rounded-xl surface-2 p-3.5 font-mono text-xs leading-relaxed">
                  icqq-gateway host approve {pairing.master_url} {pairing.code}
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <Step n={2} />
              <p className="flex-1 text-muted">
                或让远程管理员登录后打开{" "}
                <Link
                  href="/pair"
                  className="font-medium text-brand-600 underline"
                >
                  /pair
                </Link>{" "}
                页面，填写主控地址与配对码。
              </p>
            </li>
          </ol>
          <p className="text-xs text-muted">
            配对码{" "}
            <strong className="font-mono tracking-wider text-[var(--text)]">
              {pairing.code}
            </strong>{" "}
            · 过期时间 {new Date(pairing.expires_at).toLocaleString()}
          </p>
          <Button
            className="w-full py-2.5"
            onClick={() => {
              onDone();
              setOpen(false);
            }}
          >
            我已在远程完成配对
          </Button>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
    </AppDialog>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-semibold text-brand-600">
      {n}
    </span>
  );
}

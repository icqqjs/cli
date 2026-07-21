"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import * as Dialog from "@radix-ui/react-dialog";
import {
  createToken,
  deleteToken,
  fetcher,
  listTokens,
  type ApiToken,
  type Me,
} from "../lib/api";
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
} from "../components/ui";
import { NavLink, TopBar } from "../components/nav";

export default function TokensPage() {
  const { data: me, error } = useSWR<Me>("/api/me", fetcher, {
    shouldRetryOnError: false,
  });

  if (error)
    return (
      <div className="grid min-h-dvh place-items-center gap-3 text-center">
        <p className="text-sm text-muted">请先登录</p>
        <Link href="/">
          <Button>去登录</Button>
        </Link>
      </div>
    );
  if (!me)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );

  return <TokensView />;
}

function TokensView() {
  const { data: tokens, mutate } = useSWR<ApiToken[]>("/api/tokens", () =>
    listTokens(),
  );

  return (
    <div className="min-h-dvh">
      <TopBar
        right={
          <>
            <NavLink href="/hosts">主机</NavLink>
            <NavLink href="/tokens">密钥</NavLink>
            <NavLink href="/docs">文档</NavLink>
          </>
        }
      />

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
        <PageHeader
          title="API 密钥"
          description="用于 MCP 与 RPC 鉴权。密钥仅在创建时完整显示一次，之后列表只保留掩码。"
          actions={<CreateTokenDialog onDone={() => void mutate()} />}
        />

        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">密钥</th>
                  <th className="px-5 py-3 font-medium">备注</th>
                  <th className="px-5 py-3 font-medium">创建时间</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!tokens && (
                  <tr>
                    <td colSpan={4} className="px-5 py-4">
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                      </div>
                    </td>
                  </tr>
                )}
                {(tokens ?? []).map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-[var(--border)] transition last:border-0 hover:surface-2"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs">
                      {t.masked}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{t.label ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs tabular-nums text-muted">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          if (!confirm(`销毁密钥 ${t.masked}？此操作不可撤销。`))
                            return;
                          await deleteToken(t.id);
                          void mutate();
                        }}
                      >
                        销毁
                      </Button>
                    </td>
                  </tr>
                ))}
                {tokens && tokens.length === 0 && (
                  <tr>
                    <td colSpan={4}>
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
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                          </svg>
                        }
                        title="还没有 API 密钥"
                        description="点击右上角「新建密钥」生成第一个，用于脚本或 MCP 客户端鉴权。"
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

function CreateTokenDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const reset = () => {
    setLabel("");
    setCreated(null);
    setErr("");
  };

  const submit = async () => {
    setErr("");
    try {
      const { token } = await createToken(label || undefined);
      setCreated(token);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      trigger={<Button>新建密钥</Button>}
      title="新建 API 密钥"
    >
      {!created ? (
        <div className="space-y-4">
          <Field label="备注（可选）" hint="用于区分用途，例如 “n8n 集成”。">
            <Input
              placeholder="例如：本地脚本"
              value={label}
              autoFocus
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </Field>
          {err && <ErrorText>{err}</ErrorText>}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost">取消</Button>
            </Dialog.Close>
            <Button onClick={() => void submit()}>生成</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm">
            密钥已生成 <Badge tone="amber">仅显示一次</Badge>
          </p>
          <div className="flex items-center gap-2 rounded-xl surface-2 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-sm">
              {created}
            </code>
            <CopyButton value={created} className="shrink-0" />
          </div>
          <p className="text-xs leading-5 text-muted">
            请立即复制并妥善保存，关闭后将无法再次查看完整密钥。
          </p>
          <div className="flex justify-end">
            <Dialog.Close asChild>
              <Button>完成</Button>
            </Dialog.Close>
          </div>
        </div>
      )}
    </AppDialog>
  );
}

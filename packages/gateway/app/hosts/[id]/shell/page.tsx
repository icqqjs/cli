"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import useSWR from "swr";
import { fetcher, listHosts, type Host, type Me } from "../../../lib/api";
import { Button } from "../../../components/ui";
import { TopBar } from "../../../components/nav";

export default function HostShellPage() {
  const params = useParams();
  const hostId = String(params.id);
  const termRef = useRef<HTMLDivElement>(null);
  const { data: me, error } = useSWR<Me>("/api/me", fetcher, {
    shouldRetryOnError: false,
  });
  const { data: hosts } = useSWR<Host[]>("/api/hosts", () => listHosts());
  const host = hosts?.find((h) => h.id === hostId);

  useEffect(() => {
    if (!host || error) return;
    let disposed = false;
    void (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      await import("@xterm/xterm/css/xterm.css");
      if (!termRef.current || disposed) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "JetBrains Mono, Menlo, monospace",
        fontSize: 13,
        theme: { background: "#14151d" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(termRef.current);
      fit.fit();

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(
        `${proto}//${window.location.host}/api/hosts/${hostId}/shell`,
      );

      ws.onopen = () => {
        term.write("\r\n\x1b[32m已连接主机 Shell\x1b[0m\r\n");
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as {
          type?: string;
          data?: string;
        };
        if (msg.type === "output" && msg.data) term.write(msg.data);
      };
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      const onResize = () => {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          );
        }
      };
      window.addEventListener("resize", onResize);

      return () => {
        disposed = true;
        window.removeEventListener("resize", onResize);
        ws.close();
        term.dispose();
      };
    })();
  }, [host, hostId, error]);

  if (error)
    return (
      <div className="grid min-h-dvh place-items-center p-8">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          去登录
        </Link>
      </div>
    );

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        right={
          <Link href={`/hosts/${hostId}`}>
            <Button variant="ghost" size="sm">
              ← 返回主机
            </Button>
          </Link>
        }
      />
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-5 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </span>
        <p className="font-mono text-xs text-muted">
          shell · {host?.name ?? hostId}
        </p>
      </div>
      <div className="min-h-0 flex-1 bg-[#14151d] p-2">
        <div ref={termRef} className="h-full w-full" />
      </div>
    </div>
  );
}

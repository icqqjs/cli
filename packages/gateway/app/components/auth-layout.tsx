"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { ReactNode, RefObject } from "react";
import { useRef } from "react";
import { FloatingNav, NavLink } from "./nav";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

/** 装饰性的控制台预览卡片，替代外部占位图，离线可用。 */
function ConsolePreview({ innerRef }: { innerRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={innerRef} className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[min(54vh,540px)] w-[min(44vw,520px)] select-none lg:block" aria-hidden>
      {/* 光晕底 */}
      <div className="aurora absolute inset-0 opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[var(--bg)]/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-transparent to-transparent" />

      {/* 主卡片 */}
      <div className="glass-pill absolute bottom-16 right-10 w-80 -rotate-2 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-auto font-mono text-[10px] text-muted">
            host: local
          </span>
        </div>
        <div className="mt-3 space-y-2 font-mono text-[11px] leading-5">
          <p className="text-muted">
            <span className="text-brand-500">$</span> icqq-gateway start
          </p>
          <p className="text-emerald-600">✓ gateway listening :8787</p>
          <p className="text-emerald-600">✓ 3 bots online</p>
          <p className="text-muted">
            <span className="text-brand-500">$</span>{" "}
            <span className="inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-[var(--text)]" />
          </p>
        </div>
      </div>

      {/* 漂浮状态徽章 */}
      <div className="glass-pill absolute bottom-56 right-64 rotate-3 rounded-xl px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-medium">MCP 已暴露</span>
        </div>
      </div>
      <div className="glass-pill absolute bottom-32 right-72 -rotate-2 rounded-xl px-3 py-2 shadow-xl">
        <span className="font-mono text-[11px] text-muted">
          ws://…/10001/rpc
        </span>
      </div>
    </div>
  );
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(heroRef.current, { opacity: 0, x: -48, duration: 1 })
        .from(
          imageRef.current,
          { opacity: 0, scale: 0.92, y: 40, duration: 1.1 },
          "-=0.7",
        )
        .from(formRef.current, { opacity: 0, y: 28, duration: 0.85 }, "-=0.55");
    },
    { scope: rootRef },
  );

  return (
    <main
      ref={rootRef}
      className="relative min-h-dvh w-full max-w-full overflow-x-hidden"
    >
      <FloatingNav right={<NavLink href="/docs">文档</NavLink>} />

      <section className="relative mx-auto flex min-h-dvh max-w-7xl flex-col gap-12 px-5 pb-20 pt-28 lg:flex-row lg:items-center lg:gap-16 lg:pb-0 lg:pt-24">
        <div ref={heroRef} className="relative z-10 flex-1 lg:max-w-3xl">
          <h1 className="display-title max-w-6xl text-[var(--text)]">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            {subtitle}
          </p>
        </div>

        <ConsolePreview innerRef={imageRef} />

        <div ref={formRef} className="relative z-20 w-full max-w-md shrink-0 lg:mr-4">
          <div className="glass-pill rounded-3xl p-8 shadow-2xl shadow-brand-600/10">
            {children}
          </div>
          <div className="mt-5 text-center text-sm text-muted">{footer}</div>
        </div>
      </section>
    </main>
  );
}

"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import type { ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  "Host-Agent",
  "跨机配对",
  "Web Shell",
  "MCP 路由",
  "扫码登录",
  "实例同步",
  "Owner 隔离",
  "RPC 桥接",
];

export function CapabilityMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!trackRef.current) return;
    gsap.to(trackRef.current, {
      xPercent: -50,
      ease: "none",
      duration: 28,
      repeat: -1,
    });
  });

  const row = [...ITEMS, ...ITEMS];

  return (
    <section
      aria-label="能力一览"
      className="overflow-hidden border-y border-[var(--border)] py-10 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]"
    >
      <div
        ref={trackRef}
        className="flex w-max gap-12 whitespace-nowrap"
      >
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            aria-hidden={i >= ITEMS.length}
            className="flex items-center gap-12 text-2xl font-medium tracking-tight text-muted md:text-3xl"
          >
            {item}
            <span className="size-1.5 rounded-full bg-brand-500/40" />
          </span>
        ))}
      </div>
    </section>
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="grid size-10 place-items-center rounded-xl bg-brand-500/10 text-brand-600 ring-1 ring-inset ring-brand-500/20">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </div>
  );
}

const FEATURES = [
  {
    title: "跨机控制面",
    body: "本机与远程 gateway 经 host-agent 统一发现、建号、恢复登录与日志 tail。",
    span: "col-span-2 row-span-2",
    icon: (
      <>
        <rect x="3" y="4" width="7" height="6" rx="1.5" />
        <rect x="14" y="4" width="7" height="6" rx="1.5" />
        <rect x="8.5" y="14" width="7" height="6" rx="1.5" />
        <path d="M10 7h4M12 10v4" />
      </>
    ),
  },
  {
    title: "配对即上线",
    body: "主控生成短期配对码，远程 approve 回推 token，无需手工搬运凭据。",
    span: "col-span-2 row-span-1",
    icon: (
      <>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </>
    ),
  },
  {
    title: "Web Shell",
    body: "基于 xterm 的完整 PTY，本机与远程一致体验。",
    span: "col-span-1 row-span-1",
    icon: (
      <>
        <path d="M4 17l6-6-6-6M12 19h8" />
      </>
    ),
  },
  {
    title: "MCP / RPC",
    body: "每台本机 bot 集中暴露统一端点。",
    span: "col-span-1 row-span-1",
    icon: (
      <>
        <circle cx="12" cy="5" r="2.5" />
        <circle cx="5" cy="19" r="2.5" />
        <circle cx="19" cy="19" r="2.5" />
        <path d="M12 7.5v4M12 11.5L6 16.8M12 11.5l6 5.3" />
      </>
    ),
  },
];

export function FeatureBento() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=120%",
        pin: pinRef.current,
        pinSpacing: true,
      });

      galleryRef.current?.querySelectorAll("[data-bento-card]").forEach((card) => {
        gsap.fromTo(
          card,
          { scale: 0.88, opacity: 0.35 },
          {
            scale: 1,
            opacity: 1,
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              end: "top 35%",
              scrub: 0.6,
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-28 md:py-40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div ref={pinRef} className="lg:pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-600">
            Capabilities
          </p>
          <h2 className="display-title mt-4 max-w-xl text-[var(--text)]">
            为运维而生的能力矩阵
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            控制面跨机，数据面本机集中。每一格能力都对应真实 API，不是演示幻灯片。
          </p>
        </div>

        <div
          ref={galleryRef}
          className="grid auto-rows-[minmax(140px,auto)] grid-flow-dense grid-cols-4 gap-4"
        >
          {FEATURES.map((f) => (
            <article
              key={f.title}
              data-bento-card
              className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] surface ${f.span}`}
            >
              <div className="aurora absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40" />
              <div className="relative flex h-full min-h-[140px] flex-col justify-between gap-4 p-5">
                <FeatureIcon>{f.icon}</FeatureIcon>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

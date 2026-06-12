/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef } from "react";
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";

import experienceJson from "@/../public/data/expreience.json";

type ExperienceItem = {
  title: string;
  company: string;
  location?: string;
  period: string;
  tags: string[];
  bullets: string[];
};

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function GlowGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),rgba(0,0,0,0)_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}

function toSafeExperienceItems(input: unknown): ExperienceItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw: any) => {
      const title = typeof raw?.title === "string" ? raw.title : "";
      const company = typeof raw?.company === "string" ? raw.company : "";
      const location =
        typeof raw?.location === "string" && raw.location.trim()
          ? raw.location
          : undefined;
      const period = typeof raw?.period === "string" ? raw.period : "";

      const tags = Array.isArray(raw?.tags)
        ? raw.tags.filter((t: any) => typeof t === "string" && t.trim())
        : [];

      const bullets = Array.isArray(raw?.bullets)
        ? raw.bullets.filter((b: any) => typeof b === "string" && b.trim())
        : [];

      if (!title || !company || !period) return null;

      return { title, company, location, period, tags, bullets } as ExperienceItem;
    })
    .filter(Boolean) as ExperienceItem[];
}

function HoloCard({
  item,
  idx,
  glow,
}: {
  item: ExperienceItem;
  idx: number;
  glow: any;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(wrapRef, { once: true, margin: "-6% 0px" });

  const y = useTransform(glow, (v: number) => (idx % 2 === 0 ? -1 : 1) * v * 8);
  const borderColor = useTransform(glow, (v: number) => `rgba(255,255,255,${0.1 + v * 0.22})`);
  const backgroundColor = useTransform(glow, (v: number) => `rgba(255,255,255,${0.05 + v * 0.09})`);

  // Hover tilt
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tiltSpringX = useSpring(tiltX, { stiffness: 200, damping: 22 });
  const tiltSpringY = useSpring(tiltY, { stiffness: 200, damping: 22 });
  const cardRotateX = useTransform(tiltSpringY, [-0.5, 0.5], [5, -5]);
  const cardRotateY = useTransform(tiltSpringX, [-0.5, 0.5], [-7, 7]);
  const shimmerX = useTransform(tiltSpringX, [-0.5, 0.5], ["20%", "80%"]);
  const shimmerY = useTransform(tiltSpringY, [-0.5, 0.5], ["20%", "80%"]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    tiltX.set((e.clientX - left) / width - 0.5);
    tiltY.set((e.clientY - top) / height - 0.5);
  };
  const onMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  // Even cards flip from left, odd from right
  const flipFrom = idx % 2 === 0 ? -90 : 90;
  const staggerDelay = (idx % 3) * 0.11;

  return (
    <motion.div ref={wrapRef} style={{ y }} className="relative">
      {/* perspective wrapper — required for child rotateY to look 3D */}
      <div style={{ perspective: "1100px" }}>
        <motion.div
          initial={{ rotateY: flipFrom, scale: 0.78, opacity: 0, y: 30 }}
          animate={inView ? { rotateY: 0, scale: 1, opacity: 1, y: 0 } : {}}
          transition={{
            rotateY: { type: "spring", stiffness: 58, damping: 13, delay: staggerDelay },
            scale: { type: "spring", stiffness: 80, damping: 16, delay: staggerDelay },
            y: { type: "spring", stiffness: 80, damping: 16, delay: staggerDelay },
            opacity: { duration: 0.28, delay: staggerDelay },
          }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* Outer glow blob */}
          <motion.div
            aria-hidden
            style={{ opacity: glow }}
            className="pointer-events-none absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(120,200,255,0.18),transparent_55%),radial-gradient(circle_at_70%_70%,rgba(255,120,220,0.12),transparent_60%)] blur-2xl"
          />

          {/* Tiltable card surface */}
          <motion.div
            ref={cardRef}
            style={{
              borderColor,
              backgroundColor,
              rotateX: cardRotateX,
              rotateY: cardRotateY,
              transformStyle: "preserve-3d",
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className={cn(
              "relative overflow-hidden rounded-2xl border",
              "backdrop-blur-2xl",
              "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.65)]",
              "px-6 py-6 sm:px-7"
            )}
          >
            {/* Mouse-tracking shimmer */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: useTransform(
                  [shimmerX, shimmerY],
                  ([sx, sy]) =>
                    `radial-gradient(circle 180px at ${sx} ${sy}, rgba(255,255,255,0.07), transparent 70%)`
                ),
              }}
            />

            {/* Glass surface highlights */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.10),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03)_40%,rgba(0,0,0,0)_70%)] opacity-70"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.10)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E\")",
              }}
            />

            {/* Card content */}
            <div className="relative">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] tracking-[0.28em] text-white/55 font-mono">
                      MISSION LOG {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      {item.company}
                      {item.location ? (
                        <span className="text-white/45"> • {item.location}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur">
                    <div className="text-[11px] tracking-[0.22em] text-white/55 font-mono">
                      STARDATE
                    </div>
                    <div className="mt-1 text-sm text-white/80">{item.period}</div>
                  </div>
                </div>

                {item.tags.length ? (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.bullets.length ? (
                  <ul className="space-y-2 text-sm leading-relaxed text-white/75">
                    {item.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function ExperienceSection() {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const glow = useTransform(scrollYProgress, [0, 0.35, 0.7, 1], [0, 1, 1, 0]);
  const headY = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.12, 0.9, 1], [0, 1, 1, 0]);
  const railFill = useTransform(scrollYProgress, [0.08, 0.92], [0, 1]);

  const items: ExperienceItem[] = useMemo(() => {
    return toSafeExperienceItems(experienceJson as any);
  }, []);

  if (!items.length) {
    return (
      <section
        ref={sectionRef as any}
        id="experience"
        className="relative z-20 mx-auto px-6 py-24 text-white"
      >
        <div className="absolute inset-0 -z-10">
          <GlowGrid />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-xs font-mono tracking-[0.35em] text-white/55">
            FLIGHT RECORDER
          </div>
          <div className="mt-3 text-sm text-white/70">
            No experience entries found. Your JSON import path or JSON schema is wrong.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef as any}
      id="experience"
      className="relative z-20 mx-auto px-6 py-24 text-white"
    >
      <div className="absolute inset-0 -z-10">
        <GlowGrid />
        {!reduced ? (
          <motion.div
            style={{ opacity: glow }}
            className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-white/25"
          />
        ) : null}
      </div>

      <motion.div
        style={{ y: reduced ? 0 : headY, opacity: reduced ? 1 : headOpacity }}
        className="sticky top-16 z-10 mb-10"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="text-xs font-mono tracking-[0.35em] text-white/55">
            FLIGHT RECORDER
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Experience
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                A clean timeline of execution: roles, systems shipped, and impact.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="text-[11px] font-mono tracking-[0.25em] text-white/55">
                SIGNAL
              </div>
              <motion.div
                style={{ opacity: glow }}
                className="mt-1 text-sm text-white/80"
              >
                LOCKED
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[64px_1fr]">
        <div className="relative hidden lg:block">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
          <motion.div
            style={{ scaleY: railFill, transformOrigin: "top", opacity: glow }}
            className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35"
          />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 space-y-10">
            {items.map((_, i) => (
              <div key={i} className="relative h-[240px]">
                <div className="absolute left-1/2 top-8 h-3 w-3 -translate-x-1/2 rounded-full border border-white/25 bg-black/60 shadow-[0_0_24px_rgba(255,255,255,0.15)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {items.map((item, idx) => (
            <HoloCard
              key={`${item.company}-${item.title}-${idx}`}
              item={item}
              idx={idx}
              glow={glow}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

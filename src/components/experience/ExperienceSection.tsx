/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  motion, useInView, useMotionValue, useScroll,
  useSpring, useTransform,
} from "framer-motion";
import experienceJson from "@/../public/data/expreience.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExperienceItem = {
  title: string; company: string; location?: string; domain?: string;
  period: string; tags: string[]; bullets: string[];
};

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const check = () => setDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return desktop;
}

function toSafeItems(input: unknown): ExperienceItem[] {
  if (!Array.isArray(input)) return [];
  return (input as any[]).flatMap((raw) => {
    const title   = typeof raw?.title   === "string" ? raw.title   : "";
    const company = typeof raw?.company === "string" ? raw.company : "";
    const period  = typeof raw?.period  === "string" ? raw.period  : "";
    if (!title || !company || !period) return [];
    const location = typeof raw?.location === "string" && raw.location.trim() ? raw.location : undefined;
    const domain   = typeof raw?.domain   === "string" && raw.domain.trim()   ? raw.domain   : undefined;
    const tags     = Array.isArray(raw?.tags)    ? raw.tags.filter((t: any) => typeof t === "string") : [];
    const bullets  = Array.isArray(raw?.bullets) ? raw.bullets.filter((b: any) => typeof b === "string") : [];
    return [{ title, company, location, domain, period, tags, bullets }];
  });
}

// ─── Accent palette ───────────────────────────────────────────────────────────

const ACCENTS = [
  { rgb: "124,58,237",  hex: "#7c3aed" }, // violet
  { rgb: "37,99,235",   hex: "#2563eb" }, // blue
  { rgb: "219,39,119",  hex: "#db2777" }, // pink
  { rgb: "2,132,199",   hex: "#0284c7" }, // sky
  { rgb: "5,150,105",   hex: "#059669" }, // emerald
  { rgb: "217,119,6",   hex: "#d97706" }, // amber
  { rgb: "220,38,38",   hex: "#dc2626" }, // red
  { rgb: "109,40,217",  hex: "#6d28d9" }, // purple
];

// ─── Company Logo ─────────────────────────────────────────────────────────────

function LogoAvatar({
  company, domain, accentRgb,
}: {
  company: string; domain?: string; accentRgb: string;
}) {
  const [imgState, setImgState] = useState<"idle" | "loaded" | "failed">("idle");
  const initial = company.charAt(0).toUpperCase();
  const showLogo = domain && imgState === "loaded";

  return (
    <div
      className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-base select-none relative overflow-hidden"
      style={showLogo ? {
        background: "rgba(255,255,255,0.94)",
        border: `1px solid rgba(${accentRgb},0.35)`,
        boxShadow: `0 0 14px rgba(${accentRgb},0.22)`,
      } : {
        background: `linear-gradient(135deg, rgba(${accentRgb},0.30), rgba(${accentRgb},0.12))`,
        border: `1px solid rgba(${accentRgb},0.50)`,
        color: `rgba(${accentRgb},1)`,
        boxShadow: `0 0 18px rgba(${accentRgb},0.30), inset 0 1px 0 rgba(255,255,255,0.10)`,
        textShadow: `0 0 12px rgba(${accentRgb},0.6)`,
      }}
    >
      {/* Initial letter — visible until logo loads successfully */}
      {!showLogo && (
        <span className="relative z-10 leading-none">{initial}</span>
      )}

      {/* Logo image loads silently in background; appears only on success */}
      {domain && imgState !== "failed" && (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={company}
          className={[
            "absolute inset-0 h-full w-full object-contain p-1.5",
            "transition-opacity duration-300",
            imgState === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none",
          ].join(" ")}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("failed")}
        />
      )}
    </div>
  );
}

// ─── Orbital ring decorations ─────────────────────────────────────────────────

function OrbitalRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "1100px", perspectiveOrigin: "70% 45%" }}
    >
      {/* Large violet ring — top right */}
      <div
        className="exp-orbit-ring ring-violet"
        style={{ left: "72%", top: "22%", width: 560, height: 560, marginLeft: -280, marginTop: -280 }}
      />
      {/* Medium blue ring — bottom left */}
      <div
        className="exp-orbit-ring ring-blue"
        style={{ left: "14%", top: "68%", width: 360, height: 360, marginLeft: -180, marginTop: -180 }}
      />
      {/* Small pink ring — mid right */}
      <div
        className="exp-orbit-ring ring-pink"
        style={{ left: "85%", top: "58%", width: 220, height: 220, marginLeft: -110, marginTop: -110 }}
      />
    </div>
  );
}

// ─── Floating cosmic orbs ─────────────────────────────────────────────────────

function CosmicOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="exp-cosmic-orb orb-1" />
      <div className="exp-cosmic-orb orb-2" />
      <div className="exp-cosmic-orb orb-3" />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ExperienceCard({
  item, idx, total,
}: {
  item: ExperienceItem; idx: number; total: number;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);
  const inView   = useInView(wrapRef, { once: true, margin: "-4% 0px" });
  const [scanKey, setScanKey] = useState(0);
  const [hovered, setHovered] = useState(false);

  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const tSX   = useSpring(tiltX, { stiffness: 140, damping: 16 });
  const tSY   = useSpring(tiltY, { stiffness: 140, damping: 16 });
  const rotX  = useTransform(tSY, [-0.5, 0.5], [12, -12]);
  const rotY  = useTransform(tSX, [-0.5, 0.5], [-16, 16]);
  const shimX = useTransform(tSX, [-0.5, 0.5], ["10%", "90%"]);
  const shimY = useTransform(tSY, [-0.5, 0.5], ["10%", "90%"]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    tiltX.set((e.clientX - left) / width  - 0.5);
    tiltY.set((e.clientY - top)  / height - 0.5);
  };
  const onMouseLeave = () => { tiltX.set(0); tiltY.set(0); setHovered(false); };
  const onMouseEnter = () => { setHovered(true); setScanKey((k) => k + 1); };

  const a = ACCENTS[idx % ACCENTS.length];
  const entranceDelay = (idx % 4) * 0.12;
  const rotYFrom = idx % 2 === 0 ? -165 : 165;
  const floatCls = ["exp-float-0", "exp-float-1", "exp-float-2"][idx % 3];

  return (
    <div ref={wrapRef} style={{ perspective: "2200px" }}>
      <div
        className={inView ? floatCls : ""}
        style={{ animationDelay: `${entranceDelay + 1.8}s`, animationFillMode: "both" }}
      >
        {/* ── Deep-space 3D entrance ── */}
        <motion.div
          initial={{ rotateY: rotYFrom, scale: 0.14, opacity: 0, y: 90, filter: "blur(32px)" }}
          animate={inView
            ? { rotateY: 0, scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }
            : {}}
          transition={{
            rotateY: { type: "spring", stiffness: 28, damping: 9,  delay: entranceDelay },
            scale:   { type: "spring", stiffness: 36, damping: 11, delay: entranceDelay },
            y:       { type: "spring", stiffness: 36, damping: 11, delay: entranceDelay },
            opacity: { duration: 0.32, delay: entranceDelay },
            filter:  { duration: 0.65, delay: entranceDelay },
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Nebula glow on hover */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-12 rounded-[48px] blur-3xl"
            animate={{ opacity: hovered ? 0.7 : 0.15 }}
            transition={{ duration: 0.45 }}
            style={{
              background: `radial-gradient(ellipse at 40% 35%, rgba(${a.rgb},0.4) 0%, transparent 60%)`,
            }}
          />

          {/* ── Tiltable card surface ── */}
          <motion.div
            ref={cardRef}
            style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onMouseEnter={onMouseEnter}
            animate={{
              boxShadow: hovered
                ? `0 0 0 1px rgba(${a.rgb},0.55), 0 40px 100px rgba(0,0,0,0.92), 0 0 70px rgba(${a.rgb},0.22)`
                : `0 0 0 1px rgba(255,255,255,0.07), 0 28px 75px rgba(0,0,0,0.8)`,
              y: hovered ? -6 : 0,
            }}
            transition={{ duration: 0.28 }}
            className="relative overflow-hidden rounded-2xl"
          >
            {/* Card body */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(145deg, #0f0f20 0%, #09091a 55%, #060610 100%)",
              }}
            />

            {/* Left accent stripe */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[3px]"
              style={{
                background: `linear-gradient(to bottom, ${a.hex}, rgba(${a.rgb},0.25))`,
                boxShadow: `2px 0 18px rgba(${a.rgb},0.35)`,
              }}
            />

            {/* Top edge glow */}
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{
                background: `linear-gradient(90deg, ${a.hex}, rgba(${a.rgb},0.2) 50%, transparent 80%)`,
              }}
            />

            {/* Large watermark number */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-2 right-4 select-none font-black leading-none"
              style={{ fontSize: "7.5rem", color: `rgba(${a.rgb},0.05)` }}
            >
              {String(idx + 1).padStart(2, "0")}
            </div>

            {/* Scan line on hover */}
            {hovered && <div key={scanKey} className="exp-scan" />}

            {/* Specular glass highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 22% 0%, rgba(255,255,255,0.07), transparent 52%)",
              }}
            />

            {/* Mouse spotlight */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: useTransform(
                  [shimX, shimY],
                  ([x, y]) =>
                    `radial-gradient(circle 260px at ${x} ${y}, rgba(${a.rgb},0.10), transparent 65%)`
                ),
              }}
            />

            {/* ── Content ── */}
            <div className="relative pl-7 pr-6 pt-5 pb-6 sm:pl-9 sm:pr-8 sm:pt-6 sm:pb-7">

              {/* Mission indicator + company logo row */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      background: a.hex,
                      boxShadow: `0 0 7px ${a.hex}, 0 0 14px rgba(${a.rgb},0.5)`,
                    }}
                  />
                  <span className="font-mono text-[10px] tracking-[0.28em] text-white/40 uppercase">
                    Mission {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                </div>
                <LogoAvatar company={item.company} domain={item.domain} accentRgb={a.rgb} />
              </div>

              {/* Role title */}
              <h3 className="mb-1 text-xl font-bold leading-snug text-white sm:text-2xl">
                {item.title}
              </h3>

              {/* Company · period row */}
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-base text-white/80">
                  {item.company}
                  {item.location && (
                    <span className="text-white/40"> · {item.location}</span>
                  )}
                </p>
                <span
                  className="shrink-0 font-mono text-sm font-medium"
                  style={{ color: `rgba(${a.rgb},0.95)` }}
                >
                  {item.period}
                </span>
              </div>

              {/* Divider */}
              <div
                className="mb-4 h-px"
                style={{
                  background: `linear-gradient(90deg, rgba(${a.rgb},0.4), rgba(255,255,255,0.05) 55%, transparent)`,
                }}
              />

              {/* Tags — fixed padding */}
              {item.tags.length > 0 && (
                <div className="mb-5 flex flex-wrap gap-2">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: `rgba(${a.rgb},0.14)`,
                        color: `rgba(${a.rgb},1)`,
                        border: `1px solid rgba(${a.rgb},0.25)`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Bullets */}
              {item.bullets.length > 0 && (
                <ul className="space-y-2.5">
                  {item.bullets.map((b, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/80">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: `rgba(${a.rgb},0.75)` }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bottom beam */}
            <div
              className="absolute inset-x-0 bottom-0 h-px transition-opacity duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${a.rgb},0.5) 50%, transparent)`,
                opacity: hovered ? 1 : 0.2,
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function ExperienceSection() {
  const reduced    = usePrefersReducedMotion();
  const isDesktop  = useIsDesktop();
  const sectionRef = useRef<HTMLElement>(null);
  const headRef    = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-8% 0px" });

  const { scrollYProgress } = useScroll({
    target: sectionRef, offset: ["start end", "end start"],
  });

  const railScale   = useTransform(scrollYProgress, [0.05, 0.92], [0, 1]);
  const railOpacity = useTransform(scrollYProgress, [0, 0.08, 0.88, 1], [0, 1, 1, 0]);

  const items = useMemo(() => toSafeItems(experienceJson as any), []);
  if (!items.length) return null;

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="relative z-20 px-4 py-24 text-white overflow-hidden sm:px-6"
    >
      {/* Faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.7) 1px,transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* 3D orbital rings — desktop only */}
      {!reduced && isDesktop && <OrbitalRings />}

      {/* Floating cosmic orbs — desktop only */}
      {!reduced && isDesktop && <CosmicOrbs />}

      {/* ── Section header ── */}
      <motion.div
        ref={headRef}
        initial={{ opacity: 0, scale: 0.55, filter: "blur(18px)" }}
        animate={headInView ? { opacity: 1, scale: 1, filter: "blur(0px)" } : {}}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] }}
        className="mb-16 text-center relative z-10"
      >
        <div className="mb-4 inline-flex items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-violet-500/70" />
          <span className="font-mono text-[10px] tracking-[0.38em] text-white/35 uppercase">
            Flight Recorder
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-violet-500/70" />
        </div>
        <h2
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{
            background:
              "linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #818cf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Experience
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/45">
          Eight missions across three continents — roles, systems shipped, and
          meaningful impact.
        </p>
      </motion.div>

      {/* ── Layout: left rail + cards ── */}
      <div className="relative mx-auto max-w-3xl z-10">

        {/* Plasma rail — lg+ only */}
        {!reduced && isDesktop && (
          <div className="absolute -left-8 top-0 bottom-0 hidden w-px lg:block">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/6 to-transparent" />
            <motion.div
              className="absolute top-0 left-0 right-0 origin-top"
              style={{
                scaleY: railScale,
                opacity: railOpacity,
                background:
                  "linear-gradient(to bottom, #7c3aed, #2563eb, #db2777)",
                boxShadow: "0 0 8px rgba(124,58,237,0.5)",
                bottom: 0,
              }}
            />
            {[0, 0.9, 1.8, 2.7].map((d, i) => (
              <div
                key={i}
                className="plasma-particle"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="space-y-8">
          {items.map((item, idx) => (
            <ExperienceCard
              key={`${item.company}-${idx}`}
              item={item}
              idx={idx}
              total={items.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

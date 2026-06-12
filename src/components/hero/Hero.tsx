/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import type { BlackHoleSceneProps } from "@/components/hero/BlackHoleScene";

const BlackHoleScene = dynamic<BlackHoleSceneProps>(
  () => import("@/components/hero/BlackHoleScene"),
  { ssr: false }
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function usePageScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      return Math.max(0, Math.min(1, (window.scrollY || 0) / max));
    };
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP(compute()));
    };
    setP(compute());
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, []);
  return p;
}

// ─── Particles ────────────────────────────────────────────────────────────────

function ParticlesOverlay({ density = 70 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    let w = 0,
      h = 0,
      raf = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    type P = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
    };
    const parts: P[] = Array.from({ length: density }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.4,
      vx: (Math.random() - 0.5) * 0.00025,
      vy: (Math.random() - 0.5) * 0.00025,
      a: 0.12 + Math.random() * 0.28,
    }));
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        if (p.y > 1.05) p.y = -0.05;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.fill();
      }
    };
    resize();
    loop();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 z-10 h-full w-full pointer-events-none"
    />
  );
}

// ─── Boot terminal ────────────────────────────────────────────────────────────

const BOOT_LINES = [
  { text: "INITIALIZING NEURAL CORE", ms: 0 },
  { text: "LOADING MISSION PARAMETERS........  [OK]", ms: 420 },
  { text: "SECURING UPLINK CHANNEL...........  [OK]", ms: 380 },
  { text: "CALIBRATING SENSORS...............  [OK]", ms: 340 },
  { text: "COMPILING IDENTITY MATRIX.........  [OK]", ms: 400 },
  { text: "MISSION STATUS: ACTIVE", ms: 320 },
];

function TypeLine({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    setShown("");
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return <>{shown}</>;
}

function BootOverlay({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [scanning, setScanning] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let alive = true;
    let elapsed = 200;
    BOOT_LINES.forEach((line, idx) => {
      elapsed += line.ms;
      setTimeout(() => {
        if (!alive) return;
        setVisibleLines((p) => [...p, idx]);
      }, elapsed);
    });
    const totalMs = elapsed;
    setTimeout(() => { if (alive) setScanning(true); }, totalMs + 60);
    setTimeout(() => { if (alive) setFading(true); }, totalMs + 480);
    setTimeout(() => { if (alive) onDone(); }, totalMs + 980);
    return () => { alive = false; };
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black"
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      {scanning && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-scan-line" />
        </div>
      )}

      <div className="w-[min(540px,92vw)] rounded-2xl border border-white/8 bg-white/[0.03] p-7 backdrop-blur-sm">
        {/* Traffic-light dots */}
        <div className="mb-5 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
          <span className="ml-3 font-mono text-[10px] tracking-[0.3em] text-white/25">
            TERMINAL — v2.0
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {BOOT_LINES.map((line, idx) => (
            <motion.div
              key={idx}
              className={`flex gap-2 ${visibleLines.includes(idx) ? "opacity-100" : "opacity-0"}`}
              initial={false}
            >
              <span className="text-white/20 shrink-0">›</span>
              <span
                className={
                  idx === BOOT_LINES.length - 1
                    ? "text-green-400"
                    : "text-green-400/75"
                }
              >
                {visibleLines.includes(idx) && (
                  <TypeLine text={line.text} />
                )}
              </span>
            </motion.div>
          ))}
          {visibleLines.length > 0 &&
            visibleLines.length < BOOT_LINES.length && (
              <motion.span
                className="ml-4 inline-block h-3.5 w-[7px] bg-green-400/80"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Scramble name ─────────────────────────────────────────────────────────────

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01#@!%&?";

function ScrambleName({
  text,
  started,
  delay = 0,
}: {
  text: string;
  started: boolean;
  delay?: number;
}) {
  const [chars, setChars] = useState<string[]>(() =>
    text.split("").map(() => " ")
  );
  const rafRef = useRef(0);

  useEffect(() => {
    if (!started) return;
    const letters = text.split("");
    let frame = 0;
    const totalFrames = letters.length * 5 + 24;

    const tick = () => {
      setChars(
        letters.map((ch, i) => {
          if (ch === " ") return " ";
          if (frame >= i * 5 + 16) return ch;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
      );
      frame++;
      if (frame <= totalFrames) rafRef.current = requestAnimationFrame(tick);
    };

    const t = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, [started, text, delay]);

  return (
    <>
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            color: ch !== text[i] ? "rgba(255,255,255,0.25)" : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

// ─── Animated role ─────────────────────────────────────────────────────────────

const ROLES = [
  "Engineer",
  "Full-Stack Developer",
  "DevOps & Infrastructure",
  "AI / ML Engineer",
  "Quant Researcher",
];

function AnimatedRole({ started }: { started: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!started) return;
    const id = setInterval(
      () => setIdx((i) => (i + 1) % ROLES.length),
      2800
    );
    return () => clearInterval(id);
  }, [started]);

  return (
    <div className="relative h-8 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ y: 22, opacity: 0, filter: "blur(5px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -22, opacity: 0, filter: "blur(5px)" }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="absolute text-lg font-light tracking-wide text-white/60"
        >
          {ROLES[idx]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Scroll dots ───────────────────────────────────────────────────────────────

function ScrollDots() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-[5px]">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-[3px] w-[3px] rounded-full bg-white/35"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.6, delay: i * 0.35, repeat: Infinity }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] tracking-[0.28em] text-white/25 uppercase">
        Scroll to explore
      </span>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const contentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  const reducedMotion = usePrefersReducedMotion();
  const [bootDone, setBootDone] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const progress = usePageScrollProgress();

  // Mouse tracking for 3D tilt + blob chase
  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const springCfg = { stiffness: 50, damping: 18, mass: 0.9 };
  const springX = useSpring(rawX, springCfg);
  const springY = useSpring(rawY, springCfg);

  // 3D tilt on the hero content block
  const rotateX = useTransform(springY, [0, 1], [5, -5]);
  const rotateY = useTransform(springX, [0, 1], [-8, 8]);

  // Blob positions trail mouse
  const blob1Left = useTransform(springX, [0, 1], ["8%", "38%"]);
  const blob1Top = useTransform(springY, [0, 1], ["5%", "45%"]);
  const blob2Left = useTransform(springX, [0, 1], ["62%", "88%"]);
  const blob2Top = useTransform(springY, [0, 1], ["58%", "28%"]);

  const onMouseMove = (e: React.MouseEvent) => {
    rawX.set(e.clientX / window.innerWidth);
    rawY.set(e.clientY / window.innerHeight);
  };
  const onMouseLeave = () => {
    rawX.set(0.5);
    rawY.set(0.5);
  };

  useEffect(() => {
    if (bootDone) {
      const t = setTimeout(() => setContentReady(true), 80);
      return () => clearTimeout(t);
    }
  }, [bootDone]);

  return (
    <section
      className="relative min-h-[100vh] w-full bg-black overflow-hidden"
      onMouseMove={reducedMotion ? undefined : onMouseMove}
      onMouseLeave={reducedMotion ? undefined : onMouseLeave}
    >
      {/* ── 3D SCENE ── */}
      {!reducedMotion ? (
        <BlackHoleScene
          progress={progress}
          enabled={bootDone}
          modelUrl="/models/blackhole.glb"
          interactive={false}
        />
      ) : (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,255,255,0.06),rgba(0,0,0,0.85)_55%,rgba(0,0,0,1)_100%)]" />
      )}

      {/* ── ANIMATED GRADIENT BLOBS ── */}
      {!reducedMotion && (
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <motion.div
            className="absolute rounded-full blur-[130px]"
            style={{
              width: 520,
              height: 520,
              left: blob1Left,
              top: blob1Top,
              translateX: "-50%",
              translateY: "-50%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)",
            }}
          />
          <motion.div
            className="absolute rounded-full blur-[150px]"
            style={{
              width: 640,
              height: 640,
              left: blob2Left,
              top: blob2Top,
              translateX: "-50%",
              translateY: "-50%",
              background:
                "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Static pink accent */}
          <div
            className="absolute rounded-full blur-[110px] opacity-[0.07]"
            style={{
              width: 380,
              height: 380,
              left: "50%",
              top: "65%",
              transform: "translate(-50%,-50%)",
              background:
                "radial-gradient(circle, rgba(236,72,153,1) 0%, transparent 70%)",
              animation: "ambientPulse2 18s ease-in-out infinite",
            }}
          />
        </div>
      )}

      {/* ── PARTICLES ── */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <ParticlesOverlay density={reducedMotion ? 40 : 70} />
      </div>

      {/* ── BOOT OVERLAY ── */}
      {!bootDone && <BootOverlay onDone={() => setBootDone(true)} />}

      {/* ── FOREGROUND ── */}
      <motion.div
        className="relative z-20 mx-auto min-h-[100vh] max-w-6xl px-6 py-24 flex items-center"
        style={
          !reducedMotion
            ? { rotateX, rotateY, transformStyle: "preserve-3d" }
            : {}
        }
      >
        <motion.div
          className="w-full max-w-2xl"
          variants={contentVariants}
          initial="hidden"
          animate={contentReady ? "visible" : "hidden"}
        >
          {/* Status badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.28em] text-white/45 uppercase">
                Ireland · India &nbsp;·&nbsp; Web / AI / Quant
              </span>
            </div>
          </motion.div>

          {/* Name — scramble reveal */}
          <motion.div variants={itemVariants} className="mt-7">
            <h1 className="font-bold leading-[0.95] tracking-tight text-white"
              style={{ fontSize: "clamp(3rem, 10vw, 5.5rem)" }}>
              <span className="block">
                <ScrambleName text="ARYAN" started={contentReady} delay={0} />
              </span>
              <span
                className="block"
                style={{
                  background:
                    "linear-gradient(135deg, #fff 0%, rgba(167,139,250,0.9) 50%, rgba(99,102,241,0.7) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                <ScrambleName text="SINGH" started={contentReady} delay={160} />
              </span>
            </h1>
          </motion.div>

          {/* Role cycling */}
          <motion.div variants={itemVariants} className="mt-4">
            <AnimatedRole started={contentReady} />
          </motion.div>

          {/* Divider line */}
          <motion.div variants={itemVariants} className="mt-6">
            <div className="h-px w-28 bg-gradient-to-r from-violet-400/60 via-white/20 to-transparent" />
          </motion.div>

          {/* Description */}
          <motion.p
            variants={itemVariants}
            className="mt-5 max-w-lg text-base leading-relaxed text-white/55"
          >
            Building at the edge of software, infrastructure, and intelligence.
            From quantum algorithms to distributed platforms — turning complexity
            into clarity.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            variants={itemVariants}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link
              href="/blogs"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-white px-5 py-3 text-sm font-bold text-black shadow-lg shadow-black/30 hover:bg-white/90 active:scale-[0.97] transition-all duration-150"
            >
              View Blogs
              <svg
                className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M2 7h10M7.5 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-5 py-3 text-sm font-medium text-white/75 backdrop-blur-sm hover:bg-white/14 hover:text-white active:scale-[0.97] transition-all duration-150"
            >
              Contact Me
            </Link>
          </motion.div>

          {/* Scroll hint */}
          <motion.div variants={itemVariants} className="mt-14">
            <ScrollDots />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── VIGNETTE ── */}
      <div className="pointer-events-none fixed inset-0 z-30 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_38%,rgba(0,0,0,0.72)_100%)]" />

      {/* ── SCROLL PROGRESS SIDEBAR (desktop only) ── */}
      {!reducedMotion && (
        <div className="pointer-events-none fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex">
          <div className="relative h-28 w-px overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-x-0 top-0 origin-top rounded-full"
              style={{
                scaleY: progress,
                height: "100%",
                background: "linear-gradient(180deg, #818cf8, #a78bfa)",
              }}
            />
          </div>
          <span className="rotate-90 font-mono text-[8px] tracking-[0.25em] text-white/20">
            {Math.round(progress * 100)}%
          </span>
        </div>
      )}
    </section>
  );
}

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
import QuantumReconstruction from "@/components/hero/QuantumReconstruction";
import HeroHUD from "@/components/hero/HeroHUD";

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

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () =>
      setMobile(window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
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
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export default function Hero() {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile      = useIsMobile();
  const [bootDone, setBootDone] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const progress = usePageScrollProgress();

  // The 3D scene now runs on mobile too — BlackHoleScene's internal
  // isLowEnd() flags small viewports and downshifts particle counts, drops
  // the HDRI, and lowers DPR so it stays smooth. We only disable for users
  // who explicitly request reduced motion.
  const use3D = !reducedMotion;

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
      onMouseMove={use3D ? onMouseMove : undefined}
      onMouseLeave={use3D ? onMouseLeave : undefined}
    >
      {/* ── 3D SCENE (desktop only) ── */}
      {use3D ? (
        <BlackHoleScene
          progress={progress}
          enabled={bootDone}
          modelUrl="/models/blackhole.glb"
          interactive={false}
        />
      ) : (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(99,102,241,0.15)_0%,rgba(0,0,0,0.9)_60%,rgba(0,0,0,1)_100%)]" />
      )}

      {/* ── ANIMATED GRADIENT BLOBS (desktop only) ── */}
      {use3D && (
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
        <ParticlesOverlay density={isMobile ? 30 : reducedMotion ? 40 : 70} />
      </div>

      {/* ── QUANTUM RECONSTRUCTION LOADER ── */}
      {!bootDone && <QuantumReconstruction onDone={() => setBootDone(true)} />}

      {/* ── HUD overlay — gives the page a probe-cockpit feel (desktop only) ── */}
      {use3D && !isMobile && bootDone && <HeroHUD springX={springX} springY={springY} />}

      {/* ── FOREGROUND ── */}
      <motion.div
        className="relative z-20 mx-auto min-h-[100vh] max-w-6xl px-6 py-24 flex items-center"
        style={
          use3D
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
            <div className="chip-readable inline-flex items-center gap-2 rounded-full px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.28em] text-white/55 uppercase">
                Ireland · India &nbsp;·&nbsp; Web / AI / Quant
              </span>
            </div>
          </motion.div>

          {/* Name — scramble reveal */}
          <motion.div variants={itemVariants} className="mt-7">
            <h1 className="font-bold leading-[0.95] tracking-tight"
              style={{ fontSize: "clamp(3rem, 10vw, 5.5rem)" }}>
              <span className="block text-flow-white">
                <ScrambleName text="ARYAN" started={contentReady} delay={0} />
              </span>
              <span className="block text-flow-aurora">
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
              className="btn-glass-light group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-bold text-black active:scale-[0.97] transition-transform duration-150"
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
              className="btn-glass-dark group inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white/85 hover:text-white active:scale-[0.97] transition-transform duration-150"
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
      {use3D && (
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

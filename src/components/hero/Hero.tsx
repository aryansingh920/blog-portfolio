/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlackHoleSceneProps } from "@/components/hero/BlackHoleScene";

const BlackHoleScene = dynamic<BlackHoleSceneProps>(
  () => import("@/components/hero/BlackHoleScene"),
  { ssr: false }
);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

function usePageScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;

    const compute = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const y = window.scrollY || 0;
      return Math.max(0, Math.min(1, y / max));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP(compute()));
    };

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP(compute()));
    };

    setP(compute());
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return p;
}


function BootOverlay({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const steps = [450, 500, 450, 550, 350];
    let i = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      setPhase(i);
      const ms = steps[i] ?? 0;
      i += 1;
      if (i < steps.length) setTimeout(tick, ms);
      else onDone();
    };

    tick();
    return () => {
      alive = false;
    };
  }, [onDone]);

  const lines = [
    "BOOT SEQUENCE…",
    "NAV SYSTEMS… OK",
    "COMMS… OK",
    "MISSION: PORTFOLIO",
  ];

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${
        phase >= 4 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-[min(520px,90vw)] rounded-2xl border border-white/10 bg-white/5 p-6 ">
        <div className="text-xs tracking-[0.25em] text-white/60">SYSTEM</div>
        <div className="mt-4 space-y-2 font-mono text-sm text-white/90">
          {lines.map((t, idx) => (
            <div
              key={t}
              className={`${
                idx <= phase ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300`}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParticlesOverlay({ density = 70 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
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
      a: 0.15 + Math.random() * 0.35,
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

        const x = p.x * w;
        const y = p.y * h;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
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

  // IMPORTANT: do not steal pointer events from OrbitControls
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 z-10 h-full w-full pointer-events-none"
    />
  );
}

export default function Hero() {
  const reducedMotion = usePrefersReducedMotion();
  const [bootDone, setBootDone] = useState(false);
  const progress = usePageScrollProgress();

  return (
    <section className="relative min-h-[100vh] w-full bg-black">
      {/* BACKGROUND (fixed viewport) */}
      {!reducedMotion ? (
        <BlackHoleScene
          progress={progress}
          enabled={bootDone}
          modelUrl="/models/blackhole.glb"
          interactive={false} // keep false unless you want OrbitControls
        />
      ) : (
        <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,255,255,0.06),rgba(0,0,0,0.85)_55%,rgba(0,0,0,1)_100%)]" />
      )}

      {/* PARTICLES overlay (fixed too, never blocks input) */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <ParticlesOverlay density={reducedMotion ? 45 : 75} />
      </div>

      {/* BOOT overlay (above everything) */}
        {!bootDone && <BootOverlay onDone={() => setBootDone(true)} />}


      {/* FOREGROUND CONTENT */}
      <div className="relative z-20 mx-auto flex min-h-[100vh] max-w-6xl flex-col justify-center px-6 py-20">
        <div className="max-w-2xl">
          <div className="font-mono text-xs tracking-[0.35em] text-white/60">
            COORDS: DUBLIN • SECTOR: WEB/AI/QUANT
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Aryan Singh
          </h1>

          <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
            Full-stack + data/quant. Building clean systems with cinematic
            interfaces.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm text-white backdrop-blur transition hover:bg-white/15"
            >
              View Projects
            </a>
            <a
              href="#contact"
              className="rounded-xl border border-white/15 bg-black/20 px-5 py-3 text-sm text-white/90 backdrop-blur transition hover:bg-black/30"
            >
              Contact
            </a>
          </div>

          <div className="mt-10 text-xs text-white/50">
            Scroll to approach the singularity.
          </div>
        </div>
      </div>

      {/* VIGNETTE overlay */}
      <div className="pointer-events-none fixed inset-0 z-30 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_40%,rgba(0,0,0,0.75)_100%)]" />
    </section>
  );
}


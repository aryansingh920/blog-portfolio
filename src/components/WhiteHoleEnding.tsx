"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";

/**
 * WhiteHoleEnding
 * ───────────────
 * The final beat of the Singularity Protocol. As the user scrolls into the
 * section, a brilliant point of light at the centre explodes outward into a
 * generative nebula — the user has emerged from the black hole through a
 * white hole. A CTA invites them to "Transmit a Message to the Universe."
 *
 * Implementation: scroll-driven SVG + canvas nebula + interactive beam.
 */

export default function WhiteHoleEnding() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [beaming, setBeaming] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const sp = useSpring(scrollYProgress, { stiffness: 110, damping: 22, mass: 0.7 });

  const coreScale = useTransform(sp, [0, 0.4, 0.6, 1], [0.05, 1.4, 1.4, 1.0]);
  const coreOpacity = useTransform(sp, [0, 0.18, 0.5, 1], [0, 1, 1, 0.85]);
  const haloScale = useTransform(sp, [0, 0.5, 1], [0.2, 3.6, 4.2]);
  const haloOpacity = useTransform(sp, [0, 0.3, 0.7, 1], [0, 0.9, 0.6, 0.1]);
  const beamLength = useTransform(sp, [0.2, 0.8], [0, 100]);
  const contentOpacity = useTransform(sp, [0.25, 0.55], [0, 1]);

  // ── Volumetric nebula canvas ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let W = 0, H = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let raf = 0;
    let last = performance.now();

    type Wisp = {
      a: number;   // angle
      r: number;   // radius
      vr: number;  // radial velocity
      va: number;  // angular velocity
      hue: number; // 0-1
      sz: number;  // size
      life: number;
      maxLife: number;
    };
    const wisps: Wisp[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (): Wisp => ({
      a: Math.random() * Math.PI * 2,
      r: 4 + Math.random() * 10,
      vr: 18 + Math.random() * 26,
      va: (Math.random() - 0.5) * 0.5,
      hue: Math.random(),
      sz: 1.0 + Math.random() * 2.4,
      life: 0,
      maxLife: 2.2 + Math.random() * 2.6,
    });

    resize();
    for (let i = 0; i < 220; i++) wisps.push(spawn());
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const cx = W / 2;
      const cy = H / 2;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,4,0.20)";
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < wisps.length; i++) {
        const w = wisps[i];
        w.r += w.vr * dt;
        w.a += w.va * dt;
        w.life += dt;
        if (w.life > w.maxLife || w.r > Math.max(W, H) * 0.65) {
          wisps[i] = spawn();
          continue;
        }
        const lp = w.life / w.maxLife;
        const fade = lp < 0.12 ? lp / 0.12 :
                     lp > 0.7  ? Math.max(0, 1 - (lp - 0.7) / 0.3) : 1;
        // Generative palette: pink → violet → cyan → gold
        let r: number, g: number, b: number;
        const h = w.hue;
        if (h < 0.25) {       r = 240 - h * 80;  g =  90 + h * 100; b = 200 + h * 60;  }
        else if (h < 0.55) {  r = 150;            g = 100 + h * 80;  b = 250;             }
        else if (h < 0.8)  {  r = 110 + h * 60;  g = 200 + h * 30;  b = 245 - h * 40;   }
        else               {  r = 255;            g = 220;            b = 140 + h * 80;   }

        const x = cx + Math.cos(w.a) * w.r;
        const y = cy + Math.sin(w.a) * w.r;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, w.sz * 6);
        grad.addColorStop(0,   `rgba(${r|0},${g|0},${b|0},${0.45 * fade})`);
        grad.addColorStop(0.5, `rgba(${r|0},${g|0},${b|0},${0.20 * fade})`);
        grad.addColorStop(1,   `rgba(${r|0},${g|0},${b|0},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, w.sz * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const triggerBeam = () => {
    setBeaming(true);
    setTimeout(() => {
      setBeaming(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1100);
  };

  return (
    <section
      ref={sectionRef}
      id="white-hole"
      className="relative z-20 min-h-[160vh] overflow-hidden"
    >
      {/* Volumetric nebula */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
      />

      {/* Pinned visualization */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center">
        {/* Halo */}
        <motion.div
          aria-hidden
          className="absolute rounded-full blur-3xl"
          style={{
            width: 380,
            height: 380,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(167,139,250,0.45) 28%, rgba(236,72,153,0.18) 58%, transparent 78%)",
            scale: haloScale,
            opacity: haloOpacity,
            mixBlendMode: "screen",
          }}
        />

        {/* Core (white hole) */}
        <motion.div
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: 56,
            height: 56,
            background:
              "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0) 70%)",
            scale: coreScale,
            opacity: coreOpacity,
            boxShadow:
              "0 0 60px 20px rgba(255,255,255,0.85), 0 0 160px 60px rgba(167,139,250,0.45)",
          }}
        />

        {/* Diagonal radial beams emanating from the core */}
        <motion.svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ opacity: contentOpacity }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            // Round to 3 decimals — keeps SSR and client serialization identical
            // (otherwise raw Math.cos drift causes a hydration mismatch).
            const x2 = (50 + Math.cos(angle) * 60).toFixed(3);
            const y2 = (50 + Math.sin(angle) * 60).toFixed(3);
            return (
              <motion.line
                key={i}
                x1="50" y1="50"
                x2={x2} y2={y2}
                stroke="url(#beamGrad)"
                strokeWidth="0.15"
                opacity={0.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0.2, 0.85, 0.2] }}
                transition={{
                  duration: 4 + i * 0.18,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.12,
                }}
              />
            );
          })}
          <defs>
            <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"  stopColor="rgba(255,255,255,0.9)" />
              <stop offset="60%" stopColor="rgba(167,139,250,0.4)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </linearGradient>
          </defs>
        </motion.svg>

        {/* Content overlay */}
        <motion.div
          className="relative z-10 text-center px-6 max-w-xl"
          style={{ opacity: contentOpacity }}
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/40" />
            <span className="font-mono text-[10px] tracking-[0.4em] text-white/45 uppercase">
              White Hole · Emission
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/40" />
          </div>

          <h2
            className="text-flow-aurora text-4xl sm:text-5xl font-bold tracking-tight"
          >
            Transmit a Message to the Universe
          </h2>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/60 max-w-md mx-auto">
            You&apos;ve passed through the singularity. Whatever happens next is
            the beginning of something new — a conversation, a project, a question.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="btn-glass-light group inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-black active:scale-[0.97] transition-transform duration-200"
              onClick={triggerBeam}
            >
              Send Message
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7.5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/blogs"
              className="btn-glass-dark inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium text-white/85 hover:text-white active:scale-[0.97] transition-transform duration-200"
            >
              Read the Blog
            </Link>
          </div>

          <div className="mt-10 font-mono text-[10px] tracking-[0.45em] text-white/30 uppercase">
            End of Transmission · 00:42:17
          </div>
        </motion.div>

        {/* "Beam to universe" flash on send */}
        {beaming && (
          <motion.div
            className="absolute inset-0 z-30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.1, times: [0, 0.4, 1], ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-white" />
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              initial={{ width: 20, height: 20 }}
              animate={{ width: 4000, height: 4000 }}
              transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(167,139,250,0.6) 30%, transparent 70%)",
              }}
            />
          </motion.div>
        )}

        {/* Beam length indicator (subtle, decorative) */}
        <motion.div
          aria-hidden
          className="absolute bottom-10 left-1/2 -translate-x-1/2 h-px w-px"
          style={{ scaleX: beamLength }}
        >
          <div className="h-px w-44 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

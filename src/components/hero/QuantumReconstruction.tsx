"use client";

import { useEffect, useRef, useState } from "react";

/**
 * QuantumReconstruction
 * ─────────────────────
 * The Singularity Protocol loader. Particles emerge from the cosmic void,
 * accelerate toward target positions sampled from the silhouette of
 * "ARYAN SINGH", briefly hold the formed name, then implode into a single
 * point with a silent white-out flash — handing off to the hero scene.
 *
 * Pure Canvas 2D, ~6500 particles, 60fps on mid-range hardware.
 *
 * Lifecycle (≈ 4.2s total):
 *   0.0 — 2.0s  CONVERGE   spring-driven flight toward letter pixels
 *   2.0 — 3.0s  HOLD       formed text breathes; sparkles drift
 *   3.0 — 3.55s IMPLODE    everything funnels into the center
 *   3.55 — 4.0s FLASH      white-out; fades to transparent for handoff
 */

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  tx: number; ty: number;     // target pixel position
  delay: number;              // staggered start
  size: number;
  hue: number;                // 0-1 phase along violet→cyan ramp
};

type Props = { onDone: () => void };

// Sample text pixels at this stride (in CSS px); smaller = denser text.
const SAMPLE_STRIDE = 4;
const MAX_PARTICLES = 7500;

function colorFor(hue: number, alpha = 1) {
  // Violet → indigo → cyan → white ramp — quantum spectrum aesthetic.
  let r: number, g: number, b: number;
  if (hue < 0.33) {
    const k = hue / 0.33;
    r = 165 - k * 25;   // 165 → 140
    g = 110 + k * 30;   // 110 → 140
    b = 255;
  } else if (hue < 0.66) {
    const k = (hue - 0.33) / 0.33;
    r = 140 + k * 40;   // 140 → 180
    g = 140 + k * 90;   // 140 → 230
    b = 255;
  } else {
    const k = (hue - 0.66) / 0.34;
    r = 180 + k * 75;   // 180 → 255
    g = 230 + k * 25;   // 230 → 255
    b = 255;
  }
  return `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
}

export default function QuantumReconstruction({ onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fading, setFading] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width  = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ── Sample target pixels from rendered text ─────────────────────────
    const off = document.createElement("canvas");
    off.width  = canvas.width;
    off.height = canvas.height;
    const offCtx = off.getContext("2d")!;
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offCtx.fillStyle = "#ffffff";
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";

    const fontSize = Math.min(cssW * 0.18, cssH * 0.20);
    offCtx.font = `900 ${fontSize}px "Geist", system-ui, -apple-system, sans-serif`;
    const lineGap = fontSize * 0.94;
    offCtx.fillText("ARYAN", cssW / 2, cssH / 2 - lineGap / 2);
    offCtx.fillText("SINGH", cssW / 2, cssH / 2 + lineGap / 2);

    const imgData = offCtx.getImageData(0, 0, off.width, off.height).data;
    const stride = SAMPLE_STRIDE * dpr;
    const targets: { x: number; y: number }[] = [];
    for (let y = 0; y < off.height; y += stride) {
      for (let x = 0; x < off.width; x += stride) {
        const i = (y * off.width + x) * 4;
        if (imgData[i + 3] > 128) {
          targets.push({ x: x / dpr, y: y / dpr });
        }
      }
    }

    // Shuffle so jitter is even when we slice MAX_PARTICLES.
    for (let i = targets.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    const N = Math.min(MAX_PARTICLES, targets.length);

    const particles: Particle[] = new Array(N);
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Math.max(cssW, cssH) * 0.85 + 80;
      const t = targets[i];
      particles[i] = {
        x: cssW / 2 + Math.cos(ang) * r,
        y: cssH / 2 + Math.sin(ang) * r,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        tx: t.x,
        ty: t.y,
        delay: Math.random() * 0.55,
        size: 0.7 + Math.random() * 1.1,
        hue: Math.random(),
      };
    }

    // ── Timeline ─────────────────────────────────────────────────────────
    const PHASE_CONVERGE = 2.0;
    const PHASE_HOLD     = PHASE_CONVERGE + 1.0;     // 3.0
    const PHASE_IMPLODE  = PHASE_HOLD + 0.55;        // 3.55
    const PHASE_FLASH    = PHASE_IMPLODE + 0.45;     // 4.0
    const cx = cssW / 2;
    const cy = cssH / 2;

    let raf = 0;
    let triggered = false;
    let lastNow = performance.now();
    const startNow = lastNow;

    const draw = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const t  = (now - startNow) / 1000;

      // ── Background fade-clear (creates motion trails) ─────────────────
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,3,0.28)";
      ctx.fillRect(0, 0, cssW, cssH);

      // Soft glow halo around the centre that intensifies on implode.
      const centreGlow = Math.max(0,
        t < PHASE_HOLD ? 0.05 :
        t < PHASE_IMPLODE ? 0.05 + (t - PHASE_HOLD) / (PHASE_IMPLODE - PHASE_HOLD) * 0.55 :
        0.6
      );
      if (centreGlow > 0.01) {
        ctx.globalCompositeOperation = "screen";
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cssW, cssH) * 0.5);
        grd.addColorStop(0,   `rgba(220,200,255,${centreGlow})`);
        grd.addColorStop(0.4, `rgba(140,120,255,${centreGlow * 0.35})`);
        grd.addColorStop(1,   `rgba(0,0,0,0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      // ── Particles ────────────────────────────────────────────────────
      ctx.globalCompositeOperation = "lighter";

      let formedCount = 0;

      for (let i = 0; i < N; i++) {
        const p = particles[i];
        const local = Math.max(0, t - p.delay);

        if (t < PHASE_CONVERGE) {
          // Spring + damped flight toward target. Spring strength rises
          // over the phase so they explode toward home rather than drift.
          const k = 6 + (local / PHASE_CONVERGE) * 26;
          const dx = p.tx - p.x;
          const dy = p.ty - p.y;
          p.vx += dx * k * dt;
          p.vy += dy * k * dt;
          p.vx *= 1 - dt * 8.5;
          p.vy *= 1 - dt * 8.5;
          p.x  += p.vx * dt;
          p.y  += p.vy * dt;
        } else if (t < PHASE_HOLD) {
          // Slight vibration around the formed letter pixel.
          formedCount++;
          const jitterT = (t - PHASE_CONVERGE) * 6 + p.delay * 12;
          p.x = p.tx + Math.sin(jitterT) * 0.55;
          p.y = p.ty + Math.cos(jitterT * 0.9) * 0.55;
        } else if (t < PHASE_IMPLODE) {
          // Implode — all particles funnel into the centre.
          const u = (t - PHASE_HOLD) / (PHASE_IMPLODE - PHASE_HOLD);
          const eased = u * u;
          p.x = p.tx + (cx - p.tx) * eased;
          p.y = p.ty + (cy - p.ty) * eased;
        } else {
          // Imploded — stack at centre while the flash takes over.
          p.x = cx;
          p.y = cy;
        }

        // Render — colour blend with implosion brightening
        const lit =
          t < PHASE_HOLD ? 0.85 :
          t < PHASE_IMPLODE ? 0.85 + (t - PHASE_HOLD) * 0.4 :
          1.6;

        ctx.fillStyle = colorFor(p.hue, Math.min(1, lit));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Progress readout (loading feedback) ──────────────────────────
      const loadProgress = Math.min(1, t / PHASE_HOLD);
      if (Math.abs(loadProgress * 100 - progressPct) > 1) {
        setProgressPct(loadProgress * 100);
      }

      // ── White-out flash ──────────────────────────────────────────────
      if (t >= PHASE_IMPLODE) {
        const flashU = Math.min(1, (t - PHASE_IMPLODE) / 0.25);
        const fade   = Math.max(0, 1 - (t - PHASE_IMPLODE - 0.25) / 0.20);
        const a = flashU * fade;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      if (t >= PHASE_FLASH && !triggered) {
        triggered = true;
        setFading(true);
        setTimeout(() => onDone(), 320);
      }

      // Continue rendering through fade-out so the canvas keeps cleaning up.
      if (t < PHASE_FLASH + 1.0) {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute inset-0 z-50 bg-black overflow-hidden"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 320ms cubic-bezier(0.4,0,0.2,1)",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      />

      {/* Diegetic status — like a probe slowly booting */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="h-px w-44 bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-400 via-cyan-300 to-white"
            style={{
              width: `${progressPct}%`,
              transition: "width 80ms linear",
              boxShadow: "0 0 12px rgba(167,139,250,0.6)",
            }}
          />
        </div>
        <div className="font-mono text-[9px] tracking-[0.4em] text-white/35 uppercase">
          Reconstructing — {progressPct.toFixed(0).padStart(3, "0")}%
        </div>
      </div>

      {/* Corner indicators — quick HUD primer */}
      <div className="absolute top-6 left-6 font-mono text-[9px] tracking-[0.34em] text-white/25 uppercase">
        Singularity Protocol · v1.0
      </div>
      <div className="absolute top-6 right-6 font-mono text-[9px] tracking-[0.34em] text-white/25 uppercase">
        Particle Cohesion :: Online
      </div>
    </div>
  );
}

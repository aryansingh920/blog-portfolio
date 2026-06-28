"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SingularityField
 * ────────────────
 * GPGPU-style particle field used as the contact page backdrop. The user's
 * cursor leaves a glowing trail that the particles flock toward — like
 * writing a message in luminous dust. On `burst` it disperses everything
 * in a shockwave (called on form submit).
 *
 * Pure Canvas 2D, ~3500 particles, runs at 60fps on mid-range hardware.
 */

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  baseX: number; baseY: number;     // resting position
  hue: number;
  size: number;
  energy: number;                   // ramps when near cursor trail
};

type TrailPoint = { x: number; y: number; age: number };

export type SingularityFieldHandle = {
  burst: () => void;
};

export default function SingularityField({
  className,
  burstRef,
}: {
  className?: string;
  burstRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const isMobile = window.innerWidth < 768;
    const COUNT = reduced ? 600 : isMobile ? 1500 : 3500;

    let W = 0, H = 0;
    let dpr = Math.min(1.75, window.devicePixelRatio || 1);
    const particles: Particle[] = [];
    const trail: TrailPoint[] = [];

    let mouseX = -9999, mouseY = -9999;
    let lastMouseTime = 0;
    let burstActive = 0;     // 0-1, decays
    let burstDir = { x: 0, y: 0 };

    const resize = () => {
      const parent = canvas.parentElement || document.body;
      const rect = parent.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(1.75, window.devicePixelRatio || 1);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Re-seed particles on a constellation grid + slight jitter
      particles.length = 0;
      const cols = Math.ceil(Math.sqrt(COUNT * (W / H)));
      const rows = Math.ceil(COUNT / cols);
      const stepX = W / cols;
      const stepY = H / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (particles.length >= COUNT) break;
          const baseX = (c + 0.5) * stepX + (Math.random() - 0.5) * stepX * 0.6;
          const baseY = (r + 0.5) * stepY + (Math.random() - 0.5) * stepY * 0.6;
          particles.push({
            x: baseX,
            y: baseY,
            vx: 0, vy: 0,
            baseX, baseY,
            hue: Math.random(),
            size: 0.6 + Math.random() * 0.9,
            energy: 0,
          });
        }
      }
    };

    resize();
    setReady(true);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      lastMouseTime = performance.now();
      trail.push({ x: mouseX, y: mouseY, age: 0 });
      if (trail.length > 60) trail.shift();
    };
    const onLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    if (burstRef) {
      burstRef.current = () => {
        burstActive = 1;
        burstDir = { x: W / 2, y: H / 2 };
      };
    }

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Background with motion trails
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,4,0.22)";
      ctx.fillRect(0, 0, W, H);

      // Update + draw trail line
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age += dt;
        if (trail[i].age > 1.6) trail.splice(i, 1);
      }
      ctx.globalCompositeOperation = "lighter";
      if (trail.length >= 2) {
        ctx.lineCap = "round";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1];
          const b = trail[i];
          const fade = Math.max(0, 1 - b.age / 1.6);
          ctx.strokeStyle = `rgba(200,170,255,${0.45 * fade})`;
          ctx.lineWidth = 1.8 * fade;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Update + draw particles
      const PULL_R = 110;
      for (const p of particles) {
        // Trail-following force
        let pullX = 0, pullY = 0;
        for (let i = trail.length - 1; i >= 0; i -= 4) {
          const t = trail[i];
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < PULL_R * PULL_R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const strength = (1 - d / PULL_R) * (1 - t.age / 1.6) * 80;
            pullX += (dx / d) * strength;
            pullY += (dy / d) * strength;
            p.energy = Math.min(1, p.energy + 0.04);
          }
        }
        // Cursor direct attraction
        if (mouseX > -9000) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < PULL_R * PULL_R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const strength = (1 - d / PULL_R) * 95;
            pullX += (dx / d) * strength;
            pullY += (dy / d) * strength;
          }
        }
        // Burst force (shockwave out from center)
        if (burstActive > 0.01) {
          const dx = p.x - burstDir.x;
          const dy = p.y - burstDir.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const push = burstActive * 600;
          pullX += (dx / d) * push;
          pullY += (dy / d) * push;
        }
        // Spring back to resting position
        const restX = (p.baseX - p.x) * 5;
        const restY = (p.baseY - p.y) * 5;

        p.vx += (pullX + restX) * dt;
        p.vy += (pullY + restY) * dt;
        p.vx *= 1 - dt * 4.5;
        p.vy *= 1 - dt * 4.5;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.energy *= 0.96;

        // Color blend — energetic particles glow warm/violet
        const e = p.energy;
        const r = Math.round(140 + e * 115);
        const g = Math.round(140 + e * 90);
        const b = 255;
        const alpha = 0.35 + e * 0.45;
        const sz = p.size * (1 + e * 1.4);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
        grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.4})`);
        grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      burstActive *= 0.92;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      if (burstRef) burstRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "pointer-events-none fixed inset-0 -z-10"}
      style={{ opacity: ready ? 1 : 0, transition: "opacity 600ms ease-out" }}
    />
  );
}

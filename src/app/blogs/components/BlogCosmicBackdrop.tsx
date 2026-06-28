"use client";

import { useEffect, useRef } from "react";

/**
 * BlogCosmicBackdrop
 * ──────────────────
 * A more intimate cosmic layer for the blog feed — softer, slower, and
 * concentrated around the screen edges where the full-bleed card doesn't
 * cover. Three depth layers of drifting glow particles plus a subtle
 * radial pulse near the centre.
 *
 * Rendered as a fixed absolute canvas; mount inside a positioned parent.
 */

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  hueIdx: number;
  life: number; maxLife: number;
  trail: { x: number; y: number }[];
  layer: 0 | 1 | 2;
};

const PALETTE = [
  "129,140,248",   // indigo-400
  "167,139,250",   // violet-400
  "236,72,153",    // pink-500
  "99,102,241",    // indigo-500
  "56,189,248",    // sky-400
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function BlogCosmicBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const isMobile = window.innerWidth < 768;

    const COUNTS = reduced
      ? { far: 30, mid: 20, near: 10 }
      : isMobile
      ? { far: 60, mid: 35, near: 18 }
      : { far: 140, mid: 80, near: 36 };

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(1.75, window.devicePixelRatio || 1);
    let raf = 0;
    let last = performance.now();

    const particles: Particle[] = [];

    const spawn = (layer: 0 | 1 | 2, fresh = false): Particle => {
      const size =
        layer === 0 ? rand(0.5, 1.2) :
        layer === 1 ? rand(1.0, 2.0) :
                      rand(1.8, 3.2);
      const speed =
        layer === 0 ? rand(6, 14) :
        layer === 1 ? rand(12, 24) :
                      rand(18, 36);
      const dir = rand(0, Math.PI * 2);
      return {
        x: fresh ? -40 : rand(-40, W + 40),
        y: rand(-40, H + 40),
        vx: Math.cos(dir) * speed,
        vy: Math.sin(dir) * speed,
        size,
        hueIdx: Math.floor(Math.random() * PALETTE.length),
        life: 0,
        maxLife: rand(8, 16),
        trail: [],
        layer,
      };
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(1.75, window.devicePixelRatio || 1);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    for (let i = 0; i < COUNTS.far; i++)  particles.push(spawn(0));
    for (let i = 0; i < COUNTS.mid; i++)  particles.push(spawn(1));
    for (let i = 0; i < COUNTS.near; i++) particles.push(spawn(2));

    window.addEventListener("resize", resize);

    const flowField = (x: number, y: number, t: number) => {
      const fx =
        Math.sin(y * 0.0050 + t * 0.20) * 12 +
        Math.cos(x * 0.0035 + t * 0.15) * 8;
      const fy =
        Math.cos(x * 0.0042 + t * 0.18) * 10 +
        Math.sin((x + y) * 0.0024 + t * 0.10) * 5;
      return [fx, fy] as const;
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = now / 1000;

      // Heavy trail fade — the blog page wants atmosphere, not stripes.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.fillRect(0, 0, W, H);

      // Central soft pulse (uses screen blend for ethereal glow)
      ctx.globalCompositeOperation = "screen";
      const pulseAlpha = 0.06 + 0.025 * Math.sin(t * 0.7);
      const cg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.55);
      cg.addColorStop(0,   `rgba(140,120,255,${pulseAlpha})`);
      cg.addColorStop(0.4, `rgba(200,80,200,${pulseAlpha * 0.4})`);
      cg.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H);

      // Particles
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const [fx, fy] = flowField(p.x, p.y, t);
        p.vx = p.vx * 0.96 + fx * dt * 2.0;
        p.vy = p.vy * 0.96 + fy * dt * 2.0;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;

        p.trail.push({ x: p.x, y: p.y });
        const trailMax = p.layer === 0 ? 3 : p.layer === 1 ? 5 : 8;
        if (p.trail.length > trailMax) p.trail.shift();

        const off = p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60;
        if (off || p.life > p.maxLife) {
          const np = spawn(p.layer, true);
          // Particle respawns from a random edge for variety.
          const side = Math.floor(Math.random() * 4);
          if (side === 0) { np.x = -30; np.y = rand(0, H); }
          else if (side === 1) { np.x = W + 30; np.y = rand(0, H); }
          else if (side === 2) { np.x = rand(0, W); np.y = -30; }
          else                  { np.x = rand(0, W); np.y = H + 30; }

          p.x = np.x; p.y = np.y; p.vx = np.vx; p.vy = np.vy;
          p.trail.length = 0; p.life = 0; p.maxLife = np.maxLife;
          p.size = np.size; p.hueIdx = np.hueIdx;
          continue;
        }

        const lp = p.life / p.maxLife;
        const fade =
          lp < 0.15 ? lp / 0.15 :
          lp > 0.75 ? Math.max(0, 1 - (lp - 0.75) / 0.25) : 1;
        const rgb = PALETTE[p.hueIdx];
        const baseA = p.layer === 0 ? 0.18 : p.layer === 1 ? 0.32 : 0.50;

        // Trail
        if (p.trail.length >= 2) {
          ctx.strokeStyle = `rgba(${rgb},${baseA * 0.5 * fade})`;
          ctx.lineWidth = p.size * 0.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.stroke();
        }

        // Head
        const r = p.size * 2.6;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        grad.addColorStop(0,   `rgba(${rgb},${baseA * 1.6 * fade})`);
        grad.addColorStop(0.5, `rgba(${rgb},${baseA * 0.6 * fade})`);
        grad.addColorStop(1,   `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

// Canvas2D star field — zero WebGL overhead, fixed behind all content.
// Draws once on mount; shooting stars animate continuously.

type Star = {
  x: number; y: number; r: number;
  brightness: number;
  // 0=white 1=blue-white 2=yellow 3=orange 4=purple
  hue: 0 | 1 | 2 | 3 | 4;
  twinklePhase: number;
  twinkleSpeed: number;
};

type Meteor = {
  x: number; y: number;
  vx: number; vy: number;
  len: number;
  alpha: number;
  life: number; maxLife: number;
};

const STAR_PALETTES: string[] = [
  "255,255,255",    // white
  "180,210,255",    // blue-white
  "255,245,180",    // yellow
  "255,185,120",    // orange
  "210,160,255",    // purple
];

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(W: number, H: number, count: number): Star[] {
  const rng   = mulberry(0xdeadbeef);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    const hue = roll < 0.50 ? 0 : roll < 0.72 ? 1 : roll < 0.88 ? 2 : roll < 0.96 ? 3 : 4;
    stars.push({
      x: rng() * W,
      y: rng() * H,
      r: rng() > 0.97 ? 1.6 + rng() * 0.8 : 0.35 + rng() * 0.85,
      brightness: 0.35 + rng() * 0.65,
      hue: hue as Star["hue"],
      twinklePhase: rng() * Math.PI * 2,
      twinkleSpeed: 0.4 + rng() * 1.2,
    });
  }
  return stars;
}

function spawnMeteor(W: number, H: number): Meteor {
  const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.4;
  const speed = 380 + Math.random() * 280;
  return {
    x: Math.random() * W,
    y: Math.random() * (H * 0.5),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: 90 + Math.random() * 120,
    alpha: 0,
    life: 0,
    maxLife: 0.55 + Math.random() * 0.4,
  };
}

export default function SpacePageBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx    = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = document.documentElement.scrollHeight;
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let raf: number;
    let lastTime = performance.now();
    let nextMeteor = 3 + Math.random() * 5; // seconds until next meteor

    const resize = () => {
      W = window.innerWidth;
      H = document.documentElement.scrollHeight;
      canvas.width  = W;
      canvas.height = H;
      stars = buildStars(W, H, Math.round(W * H / 1800));
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.clearRect(0, 0, W, H);

      const t = now / 1000;

      // ── Stars ────────────────────────────────────────────────────────────────
      for (const s of stars) {
        const twinkle = 0.75 + 0.25 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        const alpha   = s.brightness * twinkle;
        const rgb     = STAR_PALETTES[s.hue];

        if (s.r > 1.2) {
          // Bright beacon: soft glow halo
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          grd.addColorStop(0,   `rgba(${rgb},${alpha})`);
          grd.addColorStop(0.4, `rgba(${rgb},${alpha * 0.35})`);
          grd.addColorStop(1,   `rgba(${rgb},0)`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Meteors ───────────────────────────────────────────────────────────────
      nextMeteor -= dt;
      if (nextMeteor <= 0) {
        meteors.push(spawnMeteor(W, H));
        nextMeteor = 5 + Math.random() * 9;
      }

      meteors = meteors.filter((m) => m.life < m.maxLife);
      for (const m of meteors) {
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;

        const progress = m.life / m.maxLife;
        // Fade in then out
        m.alpha = progress < 0.2
          ? progress / 0.2
          : 1 - (progress - 0.2) / 0.8;

        const tx  = m.x - Math.cos(Math.atan2(m.vy, m.vx)) * m.len;
        const ty  = m.y - Math.sin(Math.atan2(m.vy, m.vx)) * m.len;
        const grd = ctx.createLinearGradient(tx, ty, m.x, m.y);
        grd.addColorStop(0, `rgba(255,255,255,0)`);
        grd.addColorStop(1, `rgba(255,255,255,${m.alpha * 0.85})`);

        ctx.strokeStyle = grd;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Glow tip
        const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 6);
        glow.addColorStop(0, `rgba(220,235,255,${m.alpha * 0.7})`);
        glow.addColorStop(1, `rgba(180,210,255,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

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
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden
    />
  );
}

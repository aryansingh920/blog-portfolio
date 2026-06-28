"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * TimelineDial
 * ────────────
 * A draggable scrubber that lets the user fast-forward / rewind through
 * the experience timeline. As the dial drags, the page scrolls smoothly
 * to the matching card's center and a brief time-warp visual flashes.
 *
 * Visible only while the section is in viewport (toggled by parent).
 */

type Notch = {
  /** Display label (year or short period). */
  label: string;
  /** DOM id of the card to scroll to. */
  cardSelector: string;
};

export default function TimelineDial({
  notches,
  active,
}: {
  notches: Notch[];
  active: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pct, setPct] = useState(0);          // 0-1 position of the dial head
  const [warp, setWarp] = useState(0);        // 0-1 transient warp intensity
  const lastScrollAt = useRef(0);

  // While not dragging, sync the dial head with the user's actual scroll.
  useEffect(() => {
    if (!active || dragging) return;
    let raf = 0;
    const update = () => {
      const cards = notches
        .map((n) => document.querySelector(n.cardSelector) as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];
      if (cards.length === 0) { raf = requestAnimationFrame(update); return; }

      const mid = window.innerHeight / 2;
      // Find which card is closest to viewport center.
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const d = Math.abs(center - mid);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      const newPct = notches.length > 1 ? bestIdx / (notches.length - 1) : 0;
      setPct((p) => p + (newPct - p) * 0.20);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [active, dragging, notches]);

  // Drag handlers
  const computePctFromX = (clientX: number) => {
    const t = trackRef.current;
    if (!t) return 0;
    const r = t.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  const scrollToIdx = (idx: number) => {
    const n = notches[idx];
    if (!n) return;
    const el = document.querySelector(n.cardSelector) as HTMLElement | null;
    if (!el) return;
    const now = performance.now();
    // Throttle scrolls so smooth-scroll doesn't compete with itself.
    if (now - lastScrollAt.current < 60) return;
    lastScrollAt.current = now;
    const r = el.getBoundingClientRect();
    const target = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: target, behavior: "smooth" });
    // Brief warp visual
    setWarp(1);
    requestAnimationFrame(() => setTimeout(() => setWarp(0), 250));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = computePctFromX(e.clientX);
    setPct(p);
    const idx = Math.round(p * (notches.length - 1));
    scrollToIdx(idx);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const p = computePctFromX(e.clientX);
    setPct(p);
    const idx = Math.round(p * (notches.length - 1));
    scrollToIdx(idx);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    // Snap to nearest notch.
    const snap = Math.round(pct * (notches.length - 1)) / Math.max(1, notches.length - 1);
    setPct(snap);
  };

  return (
    <motion.div
      aria-hidden={!active}
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: active ? 1 : 0,
        y: active ? 0 : 14,
        pointerEvents: active ? "auto" : "none",
      }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 hidden md:block"
      style={{ filter: warp > 0 ? `blur(${warp * 4}px) saturate(1.4)` : undefined }}
    >
      <div className="chip-readable rounded-2xl px-5 py-3 flex items-center gap-4">
        <span className="font-mono text-[9px] tracking-[0.34em] text-violet-300/85 uppercase">
          Time Dial
        </span>

        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative h-2 w-[280px] rounded-full cursor-grab active:cursor-grabbing select-none"
          style={{
            background: "linear-gradient(90deg, rgba(124,58,237,0.20), rgba(2,132,199,0.20), rgba(219,39,119,0.20))",
            touchAction: "none",
          }}
        >
          {/* Notch ticks */}
          {notches.map((_, i) => {
            const x = notches.length > 1 ? (i / (notches.length - 1)) * 100 : 50;
            return (
              <div
                key={i}
                className="absolute top-1/2 h-2 w-px bg-white/25 -translate-y-1/2"
                style={{ left: `${x}%` }}
              />
            );
          })}

          {/* Filled track */}
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${pct * 100}%`,
              background: "linear-gradient(90deg, #a78bfa, #38bdf8, #f0abfc)",
              boxShadow: "0 0 12px rgba(167,139,250,0.55)",
            }}
          />

          {/* Dial head */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full"
            style={{
              left: `${pct * 100}%`,
              background:
                "radial-gradient(circle, #ffffff 0%, #c4b5fd 50%, rgba(167,139,250,0) 100%)",
              boxShadow: "0 0 18px rgba(255,255,255,0.65), 0 0 32px rgba(167,139,250,0.45)",
            }}
          />
        </div>

        <span className="font-mono text-[11px] text-white/65 min-w-[68px] text-right">
          {notches[Math.round(pct * (notches.length - 1))]?.label ?? ""}
        </span>
      </div>
    </motion.div>
  );
}

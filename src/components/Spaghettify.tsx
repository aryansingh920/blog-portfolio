"use client";

import { useRef, type ReactNode } from "react";
import {
  motion, useScroll, useTransform, useMotionTemplate, useSpring,
} from "framer-motion";

/**
 * Spaghettify
 * ───────────
 * Stretches children vertically as they enter/leave the viewport, snapping
 * to their natural shape when centered — visual metaphor for gravitational
 * spaghettification near the event horizon.
 *
 * The strongest effect lives in the outer 20% of scroll progress on either
 * side; the middle 60% stays clean for readability.
 */
type Props = {
  children: ReactNode;
  /** Max vertical stretch factor at viewport edges (1.0 = no effect). */
  max?: number;
  /** Tailwind className passed to the wrapper. */
  className?: string;
  /** Glow color used for the drop-shadow halo while stretched. */
  glow?: string;
};

export default function Spaghettify({
  children, max = 2.6, className = "", glow = "rgba(167,139,250,0.55)",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Smooth the raw scroll so the warp eases rather than snapping.
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 22, mass: 0.6 });

  const scaleY  = useTransform(p, [0, 0.32, 0.68, 1], [max, 1, 1, max]);
  const scaleX  = useTransform(p, [0, 0.32, 0.68, 1], [0.62, 1, 1, 0.62]);
  const blurPx  = useTransform(p, [0, 0.32, 0.68, 1], [7, 0, 0, 7]);
  const opacity = useTransform(p, [0, 0.20, 0.80, 1], [0.18, 1, 1, 0.18]);
  const filter  = useMotionTemplate`blur(${blurPx}px) drop-shadow(0 0 ${blurPx}px ${glow})`;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        scaleY,
        scaleX,
        filter,
        opacity,
        transformOrigin: "center center",
        willChange: "transform, filter, opacity",
      }}
    >
      {children}
    </motion.div>
  );
}

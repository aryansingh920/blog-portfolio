"use client";

import { motion, type MotionValue, useTransform } from "framer-motion";

/**
 * HeroHUD
 * ───────
 * A glassmorphic Heads-Up Display layered over the hero. Gives the user
 * the feeling they are a probe observing the singularity through a
 * cockpit canopy — corner brackets, telemetry readouts, scan reticle.
 *
 * Tilts ever so slightly with the global mouse motion values from Hero
 * so reflections feel like real glass catching light.
 */

type Props = {
  springX: MotionValue<number>;
  springY: MotionValue<number>;
};

export default function HeroHUD({ springX, springY }: Props) {
  // Lightweight tilt — keeps the HUD believable, not gimmicky.
  const tiltX = useTransform(springY, [0, 1], [3, -3]);
  const tiltY = useTransform(springX, [0, 1], [-4, 4]);
  // Faint cross-axis offset that simulates parallax of the bracket layer.
  const bracketOffsetX = useTransform(springX, [0, 1], [-6, 6]);
  const bracketOffsetY = useTransform(springY, [0, 1], [-4, 4]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[35] select-none"
      style={{
        rotateX: tiltX,
        rotateY: tiltY,
        transformStyle: "preserve-3d",
        perspective: 1200,
      }}
    >
      {/* Corner brackets */}
      <motion.div style={{ x: bracketOffsetX, y: bracketOffsetY }} className="absolute inset-0">
        <CornerBracket pos="tl" />
        <CornerBracket pos="tr" />
        <CornerBracket pos="bl" />
        <CornerBracket pos="br" />
      </motion.div>

      {/* Top telemetry strip */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-5 font-mono text-[9px] tracking-[0.34em] text-white/35 uppercase">
        <Readout label="Velocity" value="0.42c" />
        <Pulse />
        <Readout label="Depth" value="8.5 ly" />
        <Pulse />
        <Readout label="Signal" value="Stable" />
      </div>

      {/* Bottom telemetry strip */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-5 font-mono text-[9px] tracking-[0.34em] text-white/30 uppercase">
        <span>Scan: Active</span>
        <span className="opacity-40">·</span>
        <span>Spectrum: 1420 MHz</span>
        <span className="opacity-40">·</span>
        <span>Singularity Lock: 87%</span>
      </div>

      {/* Side meters */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/30 rotate-180" style={{ writingMode: "vertical-rl" }}>
          GRAVITY GRADIENT
        </div>
        <SideMeter />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <SideMeter />
        <div className="font-mono text-[8px] tracking-[0.3em] text-white/30" style={{ writingMode: "vertical-rl" }}>
          PHOTON FLUX
        </div>
      </div>

      {/* Centre reticle — very subtle */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ x: bracketOffsetX, y: bracketOffsetY }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-25">
          <circle cx="60" cy="60" r="42" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeDasharray="3 5" />
          <circle cx="60" cy="60" r="56" stroke="rgba(167,139,250,0.45)" strokeWidth="0.4" />
          <line x1="60" y1="2"   x2="60" y2="14"  stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <line x1="60" y1="106" x2="60" y2="118" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <line x1="2"   y1="60" x2="14"  y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
          <line x1="106" y1="60" x2="118" y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
        </svg>
      </motion.div>
    </motion.div>
  );
}

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const posMap = {
    tl: "top-4 left-4",
    tr: "top-4 right-4 scale-x-[-1]",
    bl: "bottom-4 left-4 scale-y-[-1]",
    br: "bottom-4 right-4 scale-[-1]",
  };
  return (
    <div className={`absolute ${posMap[pos]}`}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M2 14 L2 2 L14 2" stroke="rgba(167,139,250,0.7)" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M6 22 L6 6 L22 6" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-white/25">{label}</span>
      <span className="text-violet-300/85 font-semibold">{value}</span>
    </span>
  );
}

function Pulse() {
  return (
    <motion.span
      className="inline-block h-1 w-1 rounded-full bg-violet-300"
      animate={{ opacity: [0.25, 1, 0.25] }}
      transition={{ duration: 1.6, repeat: Infinity }}
      style={{ boxShadow: "0 0 6px rgba(167,139,250,0.7)" }}
    />
  );
}

function SideMeter() {
  return (
    <div className="relative h-44 w-px bg-white/10 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 top-0 h-12 origin-top"
        animate={{ y: [0, 128, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "linear-gradient(180deg, rgba(167,139,250,0.85) 0%, rgba(99,102,241,0) 100%)",
          boxShadow: "0 0 6px rgba(167,139,250,0.5)",
        }}
      />
    </div>
  );
}

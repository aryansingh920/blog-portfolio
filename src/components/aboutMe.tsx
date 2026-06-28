"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion, useInView, useMotionValue, useSpring, useTransform,
  type TargetAndTransition, type Transition,
} from "framer-motion";
import Spaghettify from "@/components/Spaghettify";

// ─── CountUp ──────────────────────────────────────────────────────────────────

function CountUp({ to, suffix = "", duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── TiltCard ─────────────────────────────────────────────────────────────────
// wrapperClass   → applied to the outermost div (for grid col-span, etc.)
// className      → applied to the card surface only

type EntranceVariant = "flip-left" | "flip-right" | "flip-top" | "zoom-depth" | "spin-scale";

function TiltCard({
  children,
  wrapperClass = "",
  className    = "",
  glowColor    = "rgba(167,139,250,0.15)",
  accent       = "rgba(139,92,246,",
  entrance     = "flip-left",
  delay        = 0,
}: {
  children:     React.ReactNode;
  wrapperClass?: string;
  className?:   string;
  glowColor?:   string;
  accent?:      string;
  entrance?:    EntranceVariant;
  delay?:       number;
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const [hovered, setHovered] = useState(false);

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const sx = useSpring(tx, { stiffness: 160, damping: 18 });
  const sy = useSpring(ty, { stiffness: 160, damping: 18 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const shimX   = useTransform(sx, [-0.5, 0.5], ["15%", "85%"]);
  const shimY   = useTransform(sy, [-0.5, 0.5], ["15%", "85%"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    tx.set((e.clientX - left) / width - 0.5);
    ty.set((e.clientY - top) / height - 0.5);
  };
  const onLeave = () => { tx.set(0); ty.set(0); setHovered(false); };

  const initialMap: Record<EntranceVariant, TargetAndTransition> = {
    "flip-left":  { rotateY: -85, scale: 0.82, opacity: 0, y: 24 },
    "flip-right": { rotateY:  85, scale: 0.82, opacity: 0, y: 24 },
    "flip-top":   { rotateX:  70, scale: 0.85, opacity: 0, y: 30 },
    "zoom-depth": { scale: 0.15, opacity: 0, filter: "blur(14px)" },
    "spin-scale": { rotate: -12, scale: 0.55, opacity: 0, y: 36 },
  };

  const animateMap: Record<EntranceVariant, TargetAndTransition> = {
    "flip-left":  { rotateY: 0, scale: 1, opacity: 1, y: 0 },
    "flip-right": { rotateY: 0, scale: 1, opacity: 1, y: 0 },
    "flip-top":   { rotateX: 0, scale: 1, opacity: 1, y: 0 },
    "zoom-depth": { scale: 1,   opacity: 1, filter: "blur(0px)" },
    "spin-scale": { rotate: 0,  scale: 1,  opacity: 1, y: 0 },
  };

  const transitionMap: Record<EntranceVariant, Transition> = {
    "flip-left":  { type: "spring", stiffness: 55, damping: 13, delay },
    "flip-right": { type: "spring", stiffness: 55, damping: 13, delay },
    "flip-top":   { type: "spring", stiffness: 50, damping: 13, delay },
    "zoom-depth": { duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
    "spin-scale": { type: "spring", stiffness: 65, damping: 14, delay },
  };

  return (
    // wrapperClass goes here — this is the actual grid item
    <div className={wrapperClass} style={{ perspective: "1200px" }}>
      <motion.div
        ref={ref}
        initial={initialMap[entrance]}
        animate={inView ? animateMap[entrance] : {}}
        transition={transitionMap[entrance]}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => setHovered(true)}
        className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]
          backdrop-blur-xl h-full
          shadow-[0_20px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]
          transition-shadow duration-300
          hover:shadow-[0_28px_80px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.1)]
          ${className}`}
      >
        {/* Top shimmer line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}0.45), transparent)` }}
        />
        {/* Bottom accent line */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}0.3), transparent)`,
            opacity: hovered ? 0.8 : 0.2,
          }}
        />
        {/* Mouse spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: useTransform(
              [shimX, shimY],
              ([x, y]) => `radial-gradient(circle 220px at ${x} ${y}, ${glowColor}, transparent 70%)`
            ),
          }}
        />
        {/* Outer glow on hover */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[28px] blur-2xl"
          animate={{ opacity: hovered ? 0.5 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ background: `radial-gradient(circle at 40% 30%, ${accent}0.25), transparent 60%)` }}
        />
        <div className="relative p-6 sm:p-7">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30">
      {children}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: 5,  suffix: "+", label: "Years building"   },
  { value: 30, suffix: "+", label: "Projects shipped"  },
  { value: 6,  suffix: "",  label: "Domains crossed"   },
  { value: 3,  suffix: "",  label: "Countries worked"  },
];

function StatsRow() {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 75, damping: 14, delay: 0.08 + i * 0.08 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-5 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.12),transparent_60%)]" />
          <div className="relative">
            <div
              className="text-flow-violet text-3xl font-bold tracking-tight"
            >
              <CountUp to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/35">
              {s.label}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── AboutMe ──────────────────────────────────────────────────────────────────

export default function AboutMe() {
  const headRef    = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-10% 0px" });

  return (
    <section id="about" className="relative w-full">
      {/* Header */}
      <motion.div
        ref={headRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-400/60" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/30 uppercase">About</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-400/60" />
        </div>
        <h2
          className="text-flow-aurora mt-3 font-bold tracking-tight leading-tight"
          style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
        >
          Who I Am
        </h2>
      </motion.div>

      {/* 2-column grid: 4 equal cards + 1 wide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Identity */}
        <Spaghettify max={2.0} glow="rgba(139,92,246,0.45)">
          <TiltCard
            entrance="zoom-depth"
            delay={0}
            accent="rgba(139,92,246,"
            glowColor="rgba(139,92,246,0.14)"
          >
            <SectionLabel>Identity</SectionLabel>
            <h3 className="mb-3 text-base font-semibold text-white/90">
              Innovator at the Intersection
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Passionate and versatile builder at the crossroads of technology,
              data, and strategy. Driven by creative depth, technical rigour, and
              an insatiable appetite for unsolved problems — from quantum circuits
              to distributed systems.
            </p>
          </TiltCard>
        </Spaghettify>

        {/* Career */}
        <Spaghettify max={2.0} glow="rgba(99,102,241,0.45)">
          <TiltCard
            entrance="flip-right"
            delay={0.06}
            accent="rgba(99,102,241,"
            glowColor="rgba(99,102,241,0.14)"
          >
            <SectionLabel>Career</SectionLabel>
            <h3 className="mb-3 text-base font-semibold text-white/90">
              Professional Background
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Roles spanning Apple, Novade, Samsung PRISM, Chennai Metro,
              Infosys, NuCash, and Edue — covering full-stack, iOS, cloud,
              and DevOps. CTO &amp; Co-Founder of Canverro, bridging technology
              gaps with meaningful impact.
            </p>
          </TiltCard>
        </Spaghettify>

        {/* Research */}
        <Spaghettify max={2.0} glow="rgba(236,72,153,0.45)">
          <TiltCard
            entrance="flip-left"
            delay={0.1}
            accent="rgba(236,72,153,"
            glowColor="rgba(236,72,153,0.12)"
          >
            <SectionLabel>Research</SectionLabel>
            <h3 className="mb-3 text-base font-semibold text-white/90">
              Research &amp; Innovations
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Dissertation in Quantum Machine Learning for financial modelling.
              Devised a method using qudits and Grover&apos;s algorithm to break
              hash functions in linear time — applying quantum theory to real
              computational limits.
            </p>
          </TiltCard>
        </Spaghettify>

        {/* Finance */}
        <Spaghettify max={2.0} glow="rgba(16,185,129,0.45)">
          <TiltCard
            entrance="flip-top"
            delay={0.07}
            accent="rgba(16,185,129,"
            glowColor="rgba(16,185,129,0.11)"
          >
            <SectionLabel>Finance</SectionLabel>
            <h3 className="mb-3 text-base font-semibold text-white/90">
              Investment Insights
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Deep focus on quantitative investment strategy. Analysed U.S.
              equities like ServiceNow and Paycom via P/E ratios and revenue
              growth signals. Identifying alpha in small-cap companies with
              asymmetric upside potential.
            </p>
          </TiltCard>
        </Spaghettify>

        {/* Beyond Work — full width */}
        <Spaghettify max={2.2} className="md:col-span-2" glow="rgba(139,92,246,0.45)">
          <TiltCard
            entrance="spin-scale"
            delay={0.13}
            accent="rgba(139,92,246,"
            glowColor="rgba(139,92,246,0.10)"
          >
            <SectionLabel>Beyond Work</SectionLabel>
            <h3 className="mb-3 text-base font-semibold text-white/90">
              Beyond the Professional Sphere
            </h3>
            <p className="text-sm leading-relaxed text-white/55">
              Immersed in the profound mysteries of existence — evolution,
              space, quantum mechanics, philosophy, history. The interplay
              between an infinite cosmos and quantum-scale reality shapes how
              I approach every system I build. Space captivates as
              humanity&apos;s next frontier; philosophy grounds abstract
              science in human experience. These aren&apos;t separate from my
              work — they are the lens through which I pursue it.
            </p>
          </TiltCard>
        </Spaghettify>

      </div>

      <StatsRow />
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform, type TargetAndTransition, type Transition } from "framer-motion";
import { ImageDP } from "./ImageDP";

// ─── CountUp ──────────────────────────────────────────────────────────────────

function CountUp({ to, suffix = "", duration = 1.6 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ─── 3D Tilt card with configurable entrance ──────────────────────────────────

type EntranceVariant = "flip-left" | "flip-right" | "flip-top" | "zoom-depth" | "spin-scale";

function TiltCard({
  children,
  className = "",
  glowColor = "rgba(167,139,250,0.15)",
  entrance = "flip-left",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  entrance?: EntranceVariant;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const sx = useSpring(tx, { stiffness: 180, damping: 20 });
  const sy = useSpring(ty, { stiffness: 180, damping: 20 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const shimX = useTransform(sx, [-0.5, 0.5], ["20%", "80%"]);
  const shimY = useTransform(sy, [-0.5, 0.5], ["20%", "80%"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    tx.set((e.clientX - left) / width - 0.5);
    ty.set((e.clientY - top) / height - 0.5);
  };
  const onLeave = () => { tx.set(0); ty.set(0); };

  const initialMap: Record<EntranceVariant, TargetAndTransition> = {
    "flip-left":   { rotateY: -90, scale: 0.8, opacity: 0, y: 20 },
    "flip-right":  { rotateY:  90, scale: 0.8, opacity: 0, y: 20 },
    "flip-top":    { rotateX:  75, scale: 0.85, opacity: 0, y: 30 },
    "zoom-depth":  { scale: 0.2, opacity: 0, filter: "blur(12px)" },
    "spin-scale":  { rotate: -15, scale: 0.5, opacity: 0, y: 40 },
  };

  const animateMap: Record<EntranceVariant, TargetAndTransition> = {
    "flip-left":   { rotateY: 0, scale: 1, opacity: 1, y: 0 },
    "flip-right":  { rotateY: 0, scale: 1, opacity: 1, y: 0 },
    "flip-top":    { rotateX: 0, scale: 1, opacity: 1, y: 0 },
    "zoom-depth":  { scale: 1, opacity: 1, filter: "blur(0px)" },
    "spin-scale":  { rotate: 0, scale: 1, opacity: 1, y: 0 },
  };

  const transitionMap: Record<EntranceVariant, Transition> = {
    "flip-left":  { type: "spring", stiffness: 60, damping: 14, delay },
    "flip-right": { type: "spring", stiffness: 60, damping: 14, delay },
    "flip-top":   { type: "spring", stiffness: 55, damping: 13, delay },
    "zoom-depth": { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
    "spin-scale": { type: "spring", stiffness: 70, damping: 15, delay },
  };

  return (
    <div style={{ perspective: "1200px" }}>
      <motion.div
        ref={ref}
        initial={initialMap[entrance]}
        animate={inView ? animateMap[entrance] : {}}
        transition={transitionMap[entrance]}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={`relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl
          shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]
          transition-shadow duration-300 hover:shadow-[0_28px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]
          ${className}`}
      >
        {/* Top shimmer line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)" }}
        />
        {/* Mouse spotlight */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: useTransform(
              [shimX, shimY],
              ([x, y]) =>
                `radial-gradient(circle 200px at ${x} ${y}, ${glowColor}, transparent 70%)`
            ),
          }}
        />
        <div className="relative p-6 sm:p-7">{children}</div>
      </motion.div>
    </div>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-white/35 mb-2">
      {children}
    </div>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

const STATS = [
  { value: 5, suffix: "+", label: "Years building" },
  { value: 30, suffix: "+", label: "Projects shipped" },
  { value: 6, suffix: "",  label: "Domains crossed" },
  { value: 3, suffix: "",  label: "Countries worked" },
];

function StatsRow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.1 + i * 0.08 }}
          className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] backdrop-blur-xl p-5 text-center"
        >
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.12),transparent_60%)]" />
          <div className="relative">
            <div
              className="text-3xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #fff 0%, rgba(167,139,250,0.9) 60%, rgba(99,102,241,0.8) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              <CountUp to={s.value} suffix={s.suffix} />
            </div>
            <div className="mt-1 text-xs text-white/40 font-mono tracking-wider uppercase">
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
  const headRef = useRef<HTMLDivElement>(null);
  const headInView = useInView(headRef, { once: true, margin: "-10% 0px" });

  return (
    <section id="about" className="relative w-full">
      {/* Section header */}
      <motion.div
        ref={headRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10"
      >
        <div className="inline-flex items-center gap-3">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-400/60" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/35 uppercase">About</span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-400/60" />
        </div>
        <h2
          className="mt-3 font-bold tracking-tight leading-tight"
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            background: "linear-gradient(135deg, #fff 0%, rgba(167,139,250,0.85) 60%, rgba(99,102,241,0.7) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Who I Am
        </h2>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Avatar + intro — zoom from depth */}
        <TiltCard
          className="md:col-span-2 lg:col-span-1 flex flex-col items-center text-center"
          glowColor="rgba(167,139,250,0.12)"
          entrance="zoom-depth"
          delay={0}
        >
          <div className="mb-5">
            <ImageDP />
          </div>
          <SectionLabel>Identity</SectionLabel>
          <p className="text-sm leading-relaxed text-white/60">
            Passionate and versatile innovator at the intersection of technology,
            data, and strategy. Fueled by creativity, technical depth, and an
            appetite for unsolved problems.
          </p>
        </TiltCard>

        {/* Professional background — flip from left */}
        <TiltCard glowColor="rgba(99,102,241,0.14)" entrance="flip-left" delay={0.05}>
          <SectionLabel>Career</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Professional Background
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Roles spanning Novade, Samsung PRISM, Chennai Metro Rails, Infosys,
            Nucash, and Edue — covering full-stack, iOS, cloud, and DevOps. CTO
            &amp; Co-Founder of Canverro, bridging technology gaps with meaningful
            impact.
          </p>
        </TiltCard>

        {/* Research — flip from right */}
        <TiltCard glowColor="rgba(236,72,153,0.1)" entrance="flip-right" delay={0.1}>
          <SectionLabel>Research</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Research &amp; Innovations
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Dissertation in Quantum Machine Learning for financial modeling.
            Devised a method using qudits and Grover&apos;s algorithm to break hash
            functions in linear time — applying quantum theory to real
            computational limits.
          </p>
        </TiltCard>

        {/* Quant — flip from top */}
        <TiltCard glowColor="rgba(34,197,94,0.1)" entrance="flip-top" delay={0.08}>
          <SectionLabel>Finance</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Investment Insights
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Deep focus on quantitative investment strategy. Analyzed U.S. stocks
            like ServiceNow and Paycom via P/E ratios and revenue growth signals.
            Identifying alpha in small-cap companies with asymmetric upside.
          </p>
        </TiltCard>

        {/* Philosophy — spin+scale entrance, spans 2 cols */}
        <TiltCard
          className="md:col-span-2"
          glowColor="rgba(167,139,250,0.1)"
          entrance="spin-scale"
          delay={0.12}
        >
          <SectionLabel>Beyond Work</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Beyond the Professional Sphere
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Immersed in the profound mysteries of existence — evolution, space,
            quantum mechanics, philosophy, history. The interplay between an
            infinite cosmos and quantum-scale reality shapes how I approach every
            system I build. Space captivates as humanity&apos;s next frontier;
            philosophy grounds abstract science in human experience. These
            aren&apos;t separate from my work — they are the lens through which
            I pursue it.
          </p>
        </TiltCard>
      </div>

      {/* Animated stats */}
      <StatsRow />
    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ImageDP } from "./ImageDP";

// ─── 3D tilt card ─────────────────────────────────────────────────────────────

function TiltCard({
  children,
  className = "",
  glowColor = "rgba(167,139,250,0.15)",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)",
        }}
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
      {/* Outer glow */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-[28px] opacity-0 transition-opacity duration-500 group-hover:opacity-100 blur-2xl"
        style={{ background: glowColor }}
      />
      <div className="relative p-6 sm:p-7">{children}</div>
    </motion.div>
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
          <span className="font-mono text-[10px] tracking-[0.3em] text-white/35 uppercase">
            About
          </span>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-400/60" />
        </div>
        <h2
          className="mt-3 font-bold tracking-tight leading-tight"
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            background:
              "linear-gradient(135deg, #fff 0%, rgba(167,139,250,0.85) 60%, rgba(99,102,241,0.7) 100%)",
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
        {/* Avatar + intro — spans full width on mobile, 1 col on desktop */}
        <TiltCard
          className="md:col-span-2 lg:col-span-1 flex flex-col items-center text-center"
          glowColor="rgba(167,139,250,0.12)"
        >
          <div className="mb-5">
            <ImageDP />
          </div>
          <SectionLabel>Identity</SectionLabel>
          <p className="text-sm leading-relaxed text-white/60">
            Passionate and versatile innovator at the intersection of
            technology, data, and strategy. Fueled by creativity, technical
            depth, and an appetite for unsolved problems.
          </p>
        </TiltCard>

        {/* Professional background */}
        <TiltCard glowColor="rgba(99,102,241,0.14)">
          <SectionLabel>Career</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Professional Background
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Roles spanning Novade, Samsung PRISM, Chennai Metro Rails, Infosys,
            Nucash, and Edue — covering full-stack, iOS, cloud, and DevOps. CTO
            &amp; Co-Founder of Canverro, bridging technology gaps with
            meaningful impact.
          </p>
        </TiltCard>

        {/* Research */}
        <TiltCard glowColor="rgba(236,72,153,0.1)">
          <SectionLabel>Research</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Research &amp; Innovations
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Dissertation in Quantum Machine Learning for financial modeling.
            Devised a method using qudits and Grover&apos;s algorithm to break
            hash functions in linear time — applying quantum theory to real
            computational limits.
          </p>
        </TiltCard>

        {/* Quant */}
        <TiltCard glowColor="rgba(34,197,94,0.1)">
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

        {/* Philosophy — spans 2 cols */}
        <TiltCard
          className="md:col-span-2"
          glowColor="rgba(167,139,250,0.1)"
        >
          <SectionLabel>Beyond Work</SectionLabel>
          <h3 className="mb-3 text-base font-semibold text-white/90">
            Beyond the Professional Sphere
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            Immersed in the profound mysteries of existence — evolution, space,
            quantum mechanics, philosophy, history. The interplay between an
            infinite cosmos and quantum-scale reality shapes how I approach
            every system I build. Space captivates as humanity&apos;s next
            frontier; philosophy grounds abstract science in human experience.
            These aren&apos;t separate from my work — they are the lens through
            which I pursue it.
          </p>
        </TiltCard>
      </div>
    </section>
  );
}

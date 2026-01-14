/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { BlogPost } from "../types";
import { useSearchParams } from "next/navigation";
import { BlogsHeader } from "./BlogsHeader";
import { BlogCard } from "./BlogCard";

const V_OFFSET = 120;
const H_OFFSET = 120;

// velocity thresholds in px/s
const V_VELOCITY = 800;
const H_VELOCITY = 800;

const WHEEL_THRESHOLD = 42;

const ONBOARDING_KEY = "blogs_swipe_onboarding_v1";
const ONBOARDING_TTL_MS = 15 * 60 * 1000;

const H_DOMINANCE_RATIO = 1.6;
const NAV_COOLDOWN_MS = 220;

type SwipeFeedProps = {
  posts: BlogPost[];
  initialIndex?: number;
  initialSection?: string;
};

function resetMotionPair(x: MotionValue<number>, y: MotionValue<number>) {
  x.stop();
  y.stop();
  x.set(0);
  y.set(0);
}

function useCardMotion() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateY = useTransform(x, [-260, 0, 260], [-11, 0, 11]);
  const rotateX = useTransform(y, [-260, 0, 260], [11, 0, -11]);
  const rotateZ = useTransform(x, [-300, 0, 300], [-3, 0, 3]);

  const liftX = useTransform(x, (v) => Math.abs(v));
  const liftY = useTransform(y, (v) => Math.abs(v));
  const lift = useTransform([liftX, liftY], (v) => {
    const [lx, ly] = v as [number, number];
    return Math.min(1, (lx + ly) / 420);
  });

  const cardScale = useTransform(lift, [0, 1], [1, 0.985]);
  const shadow = useTransform(
    lift,
    [0, 1],
    ["0px 14px 26px rgba(0,0,0,0.22)", "0px 28px 52px rgba(0,0,0,0.42)"]
  );

  return { x, y, rotateX, rotateY, rotateZ, cardScale, shadow };
}

export function SwipeFeed({
  posts,
  initialIndex = 0,
  initialSection = "All",
}: SwipeFeedProps) {
  const searchParams = useSearchParams();

  // sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add((p.tag ?? "").trim() || "Blog");
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  // init from URL once
  const initRef = useRef<{ section: string; i: number } | null>(null);
  if (initRef.current === null) {
    const sRaw = (searchParams?.get("section") ?? "").trim();
    const section = sections.includes(sRaw) ? sRaw : initialSection ?? "All";

    const iRaw = searchParams?.get("i");
    const parsedI = Number(iRaw);
    const i = Number.isFinite(parsedI) ? Math.max(0, parsedI) : initialIndex;

    initRef.current = { section, i };
  }

  const [activeSection, setActiveSection] = useState(
    () => initRef.current!.section
  );

  const filteredPosts = useMemo(() => {
    if (activeSection === "All") return posts;
    return posts.filter(
      (p) => ((p.tag ?? "").trim() || "Blog") === activeSection
    );
  }, [posts, activeSection]);

  const n = filteredPosts.length;

  const mod = useCallback(
    (i: number) => {
      if (n === 0) return 0;
      return ((i % n) + n) % n;
    },
    [n]
  );

  const [index, setIndex] = useState(() => {
    if (!n) return 0;
    return mod(Math.max(0, initRef.current!.i));
  });

  // URL writer (no Next navigation)
  const writeUrl = useCallback((nextIndex: number, nextSection: string) => {
    const cur = new URLSearchParams(window.location.search);
    cur.set("i", String(nextIndex));
    cur.set("section", nextSection);
    const nextUrl = `${window.location.pathname}?${cur.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  // around posts
  const current = n ? filteredPosts[mod(index)] : undefined;
  const prevPost = useMemo(
    () => (n ? filteredPosts[mod(index - 1)] : undefined),
    [n, filteredPosts, mod, index]
  );
  const nextPost = useMemo(
    () => (n ? filteredPosts[mod(index + 1)] : undefined),
    [n, filteredPosts, mod, index]
  );
  const prev2Post = useMemo(
    () => (n ? filteredPosts[mod(index - 2)] : undefined),
    [n, filteredPosts, mod, index]
  );
  const next2Post = useMemo(
    () => (n ? filteredPosts[mod(index + 2)] : undefined),
    [n, filteredPosts, mod, index]
  );

  // motion
  const { x, y, rotateX, rotateY, rotateZ, cardScale, shadow } =
    useCardMotion();

  // Under-card reveal linked to y
  const nextOpacity = useTransform(y, [-280, -60, 0], [1, 0.85, 0]);
  const nextScale = useTransform(y, [-280, 0], [1, 0.965]);
  const nextY = useTransform(y, [-280, 0], [-10, 26]);

  const prevOpacity = useTransform(y, [0, 60, 280], [0, 0.85, 1]);
  const prevScale = useTransform(y, [0, 280], [0.965, 1]);
  const prevY = useTransform(y, [0, 280], [26, -10]);

  const next2Opacity = useTransform(y, [-320, -110, 0], [0.55, 0.3, 0]);
  const next2Scale = useTransform(y, [-320, 0], [0.985, 0.94]);
  const next2Y = useTransform(y, [-320, 0], [-4, 44]);

  const prev2Opacity = useTransform(y, [0, 110, 320], [0, 0.3, 0.55]);
  const prev2Scale = useTransform(y, [0, 320], [0.94, 0.985]);
  const prev2Y = useTransform(y, [0, 320], [44, -4]);

  // onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, String(Date.now()));
    } catch {}
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_KEY);
      if (!raw) {
        setShowOnboarding(true);
        return;
      }
      const lastSeen = Number(raw);
      const expired =
        !Number.isFinite(lastSeen) || Date.now() - lastSeen > ONBOARDING_TTL_MS;
      setShowOnboarding(expired);
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  // cooldown
  const lastNavAt = useRef(0);
  const canNavNow = () =>
    performance.now() - lastNavAt.current > NAV_COOLDOWN_MS;

  const wheelAccumY = useRef(0);
  const wheelAccumX = useRef(0);
  const lastWheelAxis = useRef<"x" | "y" | null>(null);

  const hardResetInputs = useCallback(() => {
    resetMotionPair(x, y);
    wheelAccumX.current = 0;
    wheelAccumY.current = 0;
    lastWheelAxis.current = null;
  }, [x, y]);

  const doNav = useCallback(
    (dir: 1 | -1) => {
      if (!n || showOnboarding) return;
      if (!canNavNow()) return;

      lastNavAt.current = performance.now();

      const nextIdx = mod(index + dir);
      writeUrl(nextIdx, activeSection);
      setIndex((i) => i + dir);

      hardResetInputs();
    },
    [n, showOnboarding, mod, index, writeUrl, activeSection, hardResetInputs]
  );

  const goNext = useCallback(() => doNav(1), [doNav]);
  const goPrev = useCallback(() => doNav(-1), [doNav]);

  const onSectionChange = (s: string) => {
    const next = sections.includes(s) ? s : "All";
    setActiveSection(next);
    setIndex(0);
    writeUrl(0, next);
    hardResetInputs();
    lastNavAt.current = 0;
  };

  useEffect(() => {
    hardResetInputs();
    if (showOnboarding) lastNavAt.current = 0;
  }, [showOnboarding, hardResetInputs]);

  // -------------------------
  // POINTER SWIPE (NO framer drag)
  // -------------------------
  const gestureRef = useRef<HTMLDivElement | null>(null);
  const ptr = useRef<{
    active: boolean;
    id: number;
    sx: number;
    sy: number;
    t0: number;
    lastX: number;
    lastY: number;
    lastT: number;
  }>({
    active: false,
    id: -1,
    sx: 0,
    sy: 0,
    t0: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
  });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!n || showOnboarding) return;

    // only primary pointer
    if (e.isPrimary === false) return;

    ptr.current.active = true;
    ptr.current.id = e.pointerId;
    ptr.current.sx = e.clientX;
    ptr.current.sy = e.clientY;
    ptr.current.t0 = performance.now();
    ptr.current.lastX = e.clientX;
    ptr.current.lastY = e.clientY;
    ptr.current.lastT = ptr.current.t0;

    // capture so we keep getting moves even if pointer leaves element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // prevent browser gestures
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptr.current.active) return;
    if (e.pointerId !== ptr.current.id) return;

    const dx = e.clientX - ptr.current.sx;
    const dy = e.clientY - ptr.current.sy;

    // update motion for feel
    x.set(dx);
    y.set(dy);

    ptr.current.lastX = e.clientX;
    ptr.current.lastY = e.clientY;
    ptr.current.lastT = performance.now();

    e.preventDefault();
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ptr.current.active) return;
    if (e.pointerId !== ptr.current.id) return;

    const t1 = performance.now();
    const dt = Math.max(1, t1 - ptr.current.t0);

    const dx = ptr.current.lastX - ptr.current.sx;
    const dy = ptr.current.lastY - ptr.current.sy;

    // velocity px/s
    const vx = (dx / dt) * 1000;
    const vy = (dy / dt) * 1000;

    ptr.current.active = false;

    // decide direction
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const horizontalDominant = absX > absY * H_DOMINANCE_RATIO;
    const verticalDominant = absY >= absX;

    let didNav = false;

    if (verticalDominant) {
      const swipeUp = dy < -V_OFFSET || vy < -V_VELOCITY;
      const swipeDown = dy > V_OFFSET || vy > V_VELOCITY;
      if (swipeUp) {
        goNext();
        didNav = true;
      } else if (swipeDown) {
        goPrev();
        didNav = true;
      }
    } else if (horizontalDominant) {
      const swipeLeft = dx < -H_OFFSET || vx < -H_VELOCITY;
      const swipeRight = dx > H_OFFSET || vx > H_VELOCITY;
      if (swipeLeft) {
        goNext();
        didNav = true;
      } else if (swipeRight) {
        goPrev();
        didNav = true;
      }
    }

    // snap back visuals if no navigation
    if (!didNav) {
      hardResetInputs();
    }

    e.preventDefault();
  };

  // wheel with native listener (still useful for desktop trackpads)
  useEffect(() => {
    const el = gestureRef.current;
    if (!el) return;

    const onWheelNative = (e: WheelEvent) => {
      if (!n || showOnboarding) return;
      if (e.ctrlKey) return; // allow pinch zoom
      e.preventDefault();

      const dx = e.deltaX;
      const dy = e.deltaY;

      const horizontalIntent = Math.abs(dx) > Math.abs(dy) * 1.2 || e.shiftKey;
      const axis: "x" | "y" = horizontalIntent ? "x" : "y";

      if (lastWheelAxis.current && lastWheelAxis.current !== axis) {
        wheelAccumX.current = 0;
        wheelAccumY.current = 0;
      }
      lastWheelAxis.current = axis;

      if (horizontalIntent) {
        wheelAccumX.current += e.shiftKey ? dy : dx;
        if (wheelAccumX.current > WHEEL_THRESHOLD) {
          wheelAccumX.current = 0;
          goPrev();
        } else if (wheelAccumX.current < -WHEEL_THRESHOLD) {
          wheelAccumX.current = 0;
          goNext();
        }
        return;
      }

      wheelAccumY.current += dy;
      if (wheelAccumY.current > WHEEL_THRESHOLD) {
        wheelAccumY.current = 0;
        goNext();
      } else if (wheelAccumY.current < -WHEEL_THRESHOLD) {
        wheelAccumY.current = 0;
        goPrev();
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative as any);
  }, [n, showOnboarding, goNext, goPrev]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showOnboarding) {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismissOnboarding();
        }
        return;
      }
      if (!n) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, showOnboarding, goNext, goPrev]);

  if (!current) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center">
          <div className="text-xl font-semibold">No posts found</div>
          <div className="opacity-70 mt-2">No posts in this section.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <BlogsHeader
        currentIndex={mod(index)}
        total={n}
        canGoPrev={true}
        canGoNext={true}
        onPrev={goPrev}
        onNext={goNext}
        sections={sections}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <main className="min-h-screen relative perspective-distant">
        {/* Under stack */}
        <div className="absolute inset-0 pointer-events-none">
          {prev2Post && (
            <motion.div
              className="absolute inset-0"
              style={{ opacity: prev2Opacity, scale: prev2Scale, y: prev2Y }}
            >
              <BlogCard post={prev2Post} />
            </motion.div>
          )}
          {next2Post && (
            <motion.div
              className="absolute inset-0"
              style={{ opacity: next2Opacity, scale: next2Scale, y: next2Y }}
            >
              <BlogCard post={next2Post} />
            </motion.div>
          )}

          {prevPost && (
            <motion.div
              className="absolute inset-0"
              style={{ opacity: prevOpacity, scale: prevScale, y: prevY }}
            >
              <BlogCard post={prevPost} />
            </motion.div>
          )}
          {nextPost && (
            <motion.div
              className="absolute inset-0"
              style={{ opacity: nextOpacity, scale: nextScale, y: nextY }}
            >
              <BlogCard post={nextPost} />
            </motion.div>
          )}
        </div>

        {/* Gesture surface + current card */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            ref={gestureRef}
            key={`card-${activeSection}-${index}`}
            className="absolute inset-0 h-svh w-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            style={{
              x,
              y,
              rotateX,
              rotateY,
              rotateZ,
              scale: cardScale,
              boxShadow: shadow,
              transformStyle: "preserve-3d",
              // critical: browser must not steal gestures
              touchAction: "none",
            }}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 24,
              mass: 0.9,
            }}
          >
            <div className="relative h-full w-full rounded-[28px] overflow-hidden ring-1 ring-white/10 bg-black">
              <BlogCard post={current} />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/7 via-transparent to-transparent" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Onboarding overlay */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              className="absolute inset-0 z-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissOnboarding}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="relative h-full w-full flex items-center justify-center p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full max-w-130 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                  <div className="text-base font-semibold">How to navigate</div>
                  <div className="mt-2 text-sm opacity-80">
                    Swipe/drag (mobile). Scroll/trackpad (desktop). Tap anywhere
                    to dismiss.
                  </div>

                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <div className="opacity-80">Next / Previous article</div>
                      <div className="font-semibold">↑ ↓ or ← →</div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold"
                      onClick={dismissOnboarding}
                    >
                      Got it
                    </button>
                    <button
                      className="px-4 py-3 rounded-2xl bg-white/10 border border-white/10"
                      onClick={dismissOnboarding}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

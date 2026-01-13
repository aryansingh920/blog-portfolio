"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  WheelEventHandler,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { BlogPost } from "../types";

import { useRouter, useSearchParams } from "next/navigation";

import { BlogsHeader } from "./BlogsHeader";
import { BlogCard } from "./BlogCard";

const V_OFFSET = 120;
const V_VELOCITY = 800;

const H_OFFSET = 120;
const H_VELOCITY = 800;

// Wheel/trackpad tuning
const WHEEL_THRESHOLD = 42;
const WHEEL_LOCK_MS = 320;
const DRAG_LOCK_MS = 220;

// Onboarding overlay key
const ONBOARDING_KEY = "blogs_swipe_onboarding_v1";
const ONBOARDING_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Gesture tuning
const H_DOMINANCE_RATIO = 1.6;

type SwipeFeedProps = {
  posts: BlogPost[];
  initialIndex?: number;
  initialSection?: string;
};

type StartInfo = { x: number; y: number; w: number; h: number };

function useLocks() {
  const lockRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);

  const lockFor = useCallback((ms: number) => {
    lockRef.current = true;
    if (unlockTimerRef.current !== null)
      window.clearTimeout(unlockTimerRef.current);

    unlockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
      unlockTimerRef.current = null;
    }, ms);
  }, []);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null)
        window.clearTimeout(unlockTimerRef.current);
    };
  }, []);

  return { lockRef, lockFor };
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

function resetMotionPair(x: MotionValue<number>, y: MotionValue<number>) {
  x.stop();
  y.stop();
  x.set(0);
  y.set(0);
}

export function SwipeFeed({
  posts,
  initialIndex = 0,
  initialSection = "All",
}: SwipeFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------- derive sections ----------
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) set.add((p.tag ?? "").trim() || "Blog");
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [posts]);

  // ---------- read URL ONCE (no reactive URL->state syncing) ----------
  const initRef = useRef<{ section: string; i: number } | null>(null);

  if (initRef.current === null) {
    const sRaw = (searchParams?.get("section") ?? "").trim();
    const s = sections.includes(sRaw) ? sRaw : initialSection ?? "All";
    const iRaw = searchParams?.get("i");
    const parsedI = Number(iRaw);
    const urlI = Number.isFinite(parsedI) ? Math.max(0, parsedI) : initialIndex;
    initRef.current = { section: s, i: urlI };
  }

  const [activeSection, setActiveSection] = useState(
    () => initRef.current!.section
  );

  // Filtered posts based on active section
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
    const safe = initRef.current!.i;
    return mod(Math.max(0, safe));
  });

  // ---------- URL writer (schedule, not navigate inline) ----------
  const pendingNavRef = useRef<{ i: number; section: string } | null>(null);
  const lastPushedRef = useRef<string>("");

  const writeUrl = useCallback((nextIndex: number, nextSection: string) => {
    pendingNavRef.current = { i: nextIndex, section: nextSection };
  }, []);

  useEffect(() => {
    const pending = pendingNavRef.current;
    if (!pending) return;

    pendingNavRef.current = null;

    const { i: nextIndex, section: nextSection } = pending;

    const cur = new URLSearchParams(window.location.search);
    const nextI = String(nextIndex);
    const nextS = nextSection;

    const curI = cur.get("i") ?? "";
    const curS = (cur.get("section") ?? "All").trim();

    if (curI === nextI && curS === nextS) return;

    cur.set("i", nextI);
    cur.set("section", nextS);

    const url = `/blogs?${cur.toString()}`;
    if (lastPushedRef.current === url) return;
    lastPushedRef.current = url;

    router.replace(url, { scroll: false });
  }, [router, index, activeSection]);

  // ---------- posts around current ----------
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

  // ----- locks -----
  const { lockRef, lockFor } = useLocks();

  // ----- wheel accumulators -----
  const wheelAccumY = useRef(0);
  const wheelAccumX = useRef(0);

  // ----- pointer start tracking -----
  const startRef = useRef<StartInfo>({ x: 0, y: 0, w: 0, h: 0 });

  const captureStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: rect.width || window.innerWidth,
      h: rect.height || window.innerHeight,
    };
  };

  // ----- motion for card feel -----
  const { x, y, rotateX, rotateY, rotateZ, cardScale, shadow } =
    useCardMotion();

  // Under-card reveal linked to y (only one side shows at a time)
  const nextOpacity = useTransform(y, [-280, -60, 0], [1, 0.85, 0]);
  const nextScale = useTransform(y, [-280, 0], [1, 0.965]);
  const nextY = useTransform(y, [-280, 0], [-10, 26]);

  const prevOpacity = useTransform(y, [0, 60, 280], [0, 0.85, 1]);
  const prevScale = useTransform(y, [0, 280], [0.965, 1]);
  const prevY = useTransform(y, [0, 280], [26, -10]);

  // Second layer further back
  const next2Opacity = useTransform(y, [-320, -110, 0], [0.55, 0.3, 0]);
  const next2Scale = useTransform(y, [-320, 0], [0.985, 0.94]);
  const next2Y = useTransform(y, [-320, 0], [-4, 44]);

  const prev2Opacity = useTransform(y, [0, 110, 320], [0, 0.3, 0.55]);
  const prev2Scale = useTransform(y, [0, 320], [0.94, 0.985]);
  const prev2Y = useTransform(y, [0, 320], [44, -4]);

  // ----- onboarding -----
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

  // ----- actions -----
  const goNext = () => {
    if (!n || lockRef.current || showOnboarding) return;

    const nextIdx = mod(index + 1);
    writeUrl(nextIdx, activeSection);
    setIndex((i) => i + 1);

    lockFor(WHEEL_LOCK_MS);
  };

  const goPrev = () => {
    if (!n || lockRef.current || showOnboarding) return;

    const nextIdx = mod(index - 1);
    writeUrl(nextIdx, activeSection);
    setIndex((i) => i - 1);

    lockFor(WHEEL_LOCK_MS);
  };

  const onSectionChange = (s: string) => {
    const next = sections.includes(s) ? s : "All";
    setActiveSection(next);
    setIndex(0);
    writeUrl(0, next);
  };

  // Hard reset motion + wheel accumulators whenever card changes or overlay toggles / section changes.
  useEffect(() => {
    resetMotionPair(x, y);
    wheelAccumX.current = 0;
    wheelAccumY.current = 0;
  }, [index, showOnboarding, x, y, activeSection]);

  // ----- drag end -----
  const onDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!n || lockRef.current || showOnboarding) return;

    const { offset, velocity } = info;

    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    const horizontalDominant = absX > absY * H_DOMINANCE_RATIO;
    const verticalDominant = absY >= absX;

    if (verticalDominant) {
      const swipeDown = offset.y > V_OFFSET || velocity.y > V_VELOCITY;
      const swipeUp = offset.y < -V_OFFSET || velocity.y < -V_VELOCITY;

      if (swipeUp) {
        goNext();
        lockFor(DRAG_LOCK_MS);
      } else if (swipeDown) {
        goPrev();
        lockFor(DRAG_LOCK_MS);
      }
      return;
    }

    if (horizontalDominant) {
      const swipeLeft = offset.x < -H_OFFSET || velocity.x < -H_VELOCITY;
      const swipeRight = offset.x > H_OFFSET || velocity.x > H_VELOCITY;

      if (swipeLeft) {
        goNext();
        lockFor(DRAG_LOCK_MS);
      } else if (swipeRight) {
        goPrev();
        lockFor(DRAG_LOCK_MS);
      }
    }
  };

  // ----- wheel/trackpad -----
  const onWheel: WheelEventHandler<HTMLDivElement> = (e) => {
    if (!n || lockRef.current || showOnboarding) return;

    // macOS pinch-to-zoom comes as wheel with ctrlKey -> do not preventDefault
    if (e.ctrlKey) return;

    e.preventDefault();

    const dx = e.deltaX;
    const dy = e.deltaY;

    const horizontalIntent = Math.abs(dx) > Math.abs(dy) * 1.2 || e.shiftKey;

    if (horizontalIntent) {
      wheelAccumX.current += e.shiftKey ? dy : dx;

      // trackpad right -> prev, left -> next (matches drag mapping)
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

  // ----- keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showOnboarding) {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismissOnboarding();
        }
        return;
      }

      if (!n || lockRef.current) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, showOnboarding, activeSection]);

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

        {/* Current card */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`card-${activeSection}-${index}`}
            className="absolute inset-0 h-svh w-full"
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.45}
            dragMomentum={false}
            dragSnapToOrigin
            dragTransition={{ bounceStiffness: 420, bounceDamping: 26 }}
            onPointerDown={captureStart}
            onDragEnd={onDragEnd}
            onWheel={onWheel}
            style={{
              x,
              y,
              rotateX,
              rotateY,
              rotateZ,
              scale: cardScale,
              boxShadow: shadow,
              transformStyle: "preserve-3d",
              touchAction: "pan-x pan-y pinch-zoom",
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
            whileDrag={{ scale: 0.99 }}
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

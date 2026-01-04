// app/blogs/components/SwipeFeed.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { BlogPost } from "../types";
import { BlogCard } from "./BlogCard";
import { BlogsHeader } from "./BlogsHeader";

const V_OFFSET = 120;
const V_VELOCITY = 800;

const H_OFFSET = 90;
const H_VELOCITY = 650;

// Wheel/trackpad tuning
const WHEEL_THRESHOLD = 42; // lower = more sensitive
const WHEEL_LOCK_MS = 320; // prevents rapid multi-advance
const DRAG_LOCK_MS = 220;

type SwipeFeedProps = {
  posts: BlogPost[];
};

export function SwipeFeed({ posts }: SwipeFeedProps) {
  const [index, setIndex] = useState(0);
  const [isPeek, setIsPeek] = useState(false);

  const n = posts.length;

  const mod = (i: number) => {
    if (n === 0) return 0;
    return ((i % n) + n) % n;
  };

  const lockRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);

  const lockFor = (ms: number) => {
    lockRef.current = true;
    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current);
    }
    unlockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
      unlockTimerRef.current = null;
    }, ms);
  };

  const wheelAccumY = useRef(0);
  const wheelAccumX = useRef(0);

  const current = n ? posts[mod(index)] : undefined;

  const goNext = () => {
    if (!n || lockRef.current) return;
    setIndex((i) => i + 1);
    lockFor(WHEEL_LOCK_MS);
  };

  const goPrev = () => {
    if (!n || lockRef.current) return;
    setIndex((i) => i - 1);
    lockFor(WHEEL_LOCK_MS);
  };

  const goRight = () => {
    if (lockRef.current) return;
    setIsPeek(false);
    lockFor(WHEEL_LOCK_MS);
  };

  const goLeft = () => {
    if (lockRef.current) return;
    setIsPeek(true);
    lockFor(WHEEL_LOCK_MS);
  };

  const onDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!n || lockRef.current) return;

    const { offset, velocity } = info;

    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);

    // Dominant axis selection prevents diagonal confusion
    if (absY >= absX) {
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

    const swipeRight = offset.x > H_OFFSET || velocity.x > H_VELOCITY;
    const swipeLeft = offset.x < -H_OFFSET || velocity.x < -H_VELOCITY;

    if (swipeLeft) {
      goLeft();
      lockFor(DRAG_LOCK_MS);
    } else if (swipeRight) {
      goRight();
      lockFor(DRAG_LOCK_MS);
    }
  };

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (!n || lockRef.current) return;

    // Prevent browser from scrolling the page
    e.preventDefault();

    const dx = e.deltaX;
    const dy = e.deltaY;

    // Many mice don't have deltaX; treat Shift+wheel as horizontal intent.
    const horizontalIntent = Math.abs(dx) > Math.abs(dy) || e.shiftKey;

    if (horizontalIntent) {
      wheelAccumX.current += e.shiftKey ? dy : dx;

      if (wheelAccumX.current > WHEEL_THRESHOLD) {
        wheelAccumX.current = 0;
        goRight();
      } else if (wheelAccumX.current < -WHEEL_THRESHOLD) {
        wheelAccumX.current = 0;
        goLeft();
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!n || lockRef.current) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goLeft();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goRight();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => {
    return () => {
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  if (!current) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="text-center">
          <div className="text-xl font-semibold">No posts found</div>
          <div className="opacity-70 mt-2">
            Provide posts to render the feed.
          </div>
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
      />

      <main className="min-h-screen relative">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${current.id}-${mod(index)}`}
            drag
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            onWheel={onWheel}
            style={{ touchAction: "none" }}
            initial={{ opacity: 0, y: 60, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="h-svh w-full"
          >
            <BlogCard post={current} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isPeek && (
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="absolute top-0 right-0 h-svh w-[82vw] max-w-95 bg-zinc-950/95 border-l border-white/10 backdrop-blur p-4 z-30"
            >
              <div className="text-sm font-semibold">Quick Actions</div>
              <div className="mt-2 text-xs opacity-70">
                Trackpad horizontal scroll or Shift+wheel = left/right. Arrow
                keys also work.
              </div>

              <div className="mt-4 grid gap-2">
                <button className="w-full px-4 py-3 rounded-2xl bg-white/10 text-left">
                  Save
                </button>
                <button className="w-full px-4 py-3 rounded-2xl bg-white/10 text-left">
                  Share
                </button>
                <button
                  className="w-full px-4 py-3 rounded-2xl bg-white text-black text-left font-semibold"
                  onClick={() => {
                    window.location.href = current.href;
                  }}
                >
                  Open (Read)
                </button>
                <button
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 text-left"
                  onClick={() => setIsPeek(false)}
                >
                  Close
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

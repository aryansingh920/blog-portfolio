"use client";

import { useEffect, useRef, useState } from "react";

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(
      "[data-scroll-container]"
    );
    if (!container) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const max = scrollHeight - clientHeight;
        setProgress(max > 0 ? Math.min(1, scrollTop / max) : 0);
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-white/8 pointer-events-none">
      <div
        className="h-full origin-left"
        style={{
          transform: `scaleX(${progress})`,
          background:
            "linear-gradient(90deg, #818cf8, #a78bfa, #c084fc)",
          transition: progress === 0 ? "none" : undefined,
          boxShadow: progress > 0.02 ? "0 0 8px rgba(167,139,250,0.6)" : "none",
        }}
      />
    </div>
  );
}

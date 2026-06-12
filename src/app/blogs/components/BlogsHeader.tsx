"use client";

import { motion } from "framer-motion";
import { ChevronUp, ChevronDown } from "lucide-react";

type BlogsHeaderProps = {
  currentIndex: number;
  total: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  sections: string[];
  activeSection: string;
  onSectionChange: (s: string) => void;
};

export function BlogsHeader({
  currentIndex,
  total,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  sections,
  activeSection,
  onSectionChange,
}: BlogsHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 px-4 pt-4 pointer-events-none">
      {/* Top bar */}
      <div className="pointer-events-auto flex items-center justify-between">
        <motion.div
          className="tabular-nums text-sm font-medium"
          key={currentIndex}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <span className="text-white font-bold">{currentIndex + 1}</span>
          <span className="text-white/30">/{total}</span>
        </motion.div>

        <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-white/60">
          Blogs
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 flex items-center justify-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90"
            aria-label="Previous"
          >
            <ChevronUp className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 flex items-center justify-center transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-90"
            aria-label="Next"
          >
            <ChevronDown className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Section tabs with animated indicator */}
      <div className="pointer-events-auto mt-3 flex gap-1 overflow-x-auto no-scrollbar pb-1">
        {sections.map((s) => {
          const active = s === activeSection;
          return (
            <button
              key={s}
              onClick={() => onSectionChange(s)}
              className="relative shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors duration-200"
            >
              {active && (
                <motion.div
                  layoutId="active-section-pill"
                  className="absolute inset-0 bg-white rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-200 ${
                  active ? "text-black" : "text-white/50 hover:text-white/80"
                }`}
              >
                {s}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

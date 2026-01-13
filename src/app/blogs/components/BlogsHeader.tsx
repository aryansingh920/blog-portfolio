"use client";

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
    <header className="fixed top-0 left-0 right-0 z-20 px-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-80">
          {currentIndex + 1}/{total}
        </div>
        <div className="text-sm font-semibold">Blogs</div>
        <div className="w-13" />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="px-3 py-2 rounded-xl bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Section filter */}
      <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {sections.map((s) => {
          const active = s === activeSection;
          return (
            <button
              key={s}
              onClick={() => onSectionChange(s)}
              className={[
                "shrink-0 px-3 py-2 rounded-2xl border text-sm",
                active
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              {s}
            </button>
          );
        })}
      </div>
    </header>
  );
}

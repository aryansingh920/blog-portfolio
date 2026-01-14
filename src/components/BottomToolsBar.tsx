"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Tool = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

type BottomToolsBarProps = {
  tools: Tool[];
  storageKey?: string;
};

export default function BottomToolsBar({
  tools,
  storageKey = "bottom_tools_hidden_v2",
}: BottomToolsBarProps) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);

  const [nudge, setNudge] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hasTools = useMemo(() => tools.length > 0, [tools]);

  useEffect(() => {
    setMounted(true);
    try {
      setHidden(localStorage.getItem(storageKey) === "1");
    } catch {
      setHidden(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, hidden ? "1" : "0");
    } catch {}
  }, [hidden, storageKey, mounted]);

  useEffect(() => {
    if (!mounted || !hidden) return;

    intervalRef.current = window.setInterval(() => {
      setNudge(true);
      timeoutRef.current = window.setTimeout(() => setNudge(false), 650);
    }, 4200);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      intervalRef.current = null;
      timeoutRef.current = null;
    };
  }, [hidden, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] pointer-events-none">
      {/* COLLAPSED HANDLE (only when hidden) */}
      {hidden && (
        <button
          type="button"
          onClick={() => setHidden(false)}
          aria-label="Show tools"
          className={[
            "pointer-events-auto",
            "absolute left-1/2 -translate-x-1/2",
            "bottom-[max(12px,env(safe-area-inset-bottom))]",
            "h-12 w-12 rounded-full",
            "bg-gradient-to-b from-white/10 to-white/5",
            "backdrop-blur-xl",
            "border border-white/12",
            "shadow-[0_10px_40px_rgba(0,0,0,0.65)]",
            "ring-1 ring-white/10",
            "flex items-center justify-center",
            "transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]",
            nudge ? "animate-bounce" : "",
          ].join(" ")}
        >
          {/* glow dot */}
          <span className="absolute inset-0 rounded-full shadow-[0_0_24px_rgba(120,160,255,0.25)]" />
          <span className="relative text-white/90 text-lg leading-none">⌃</span>
        </button>
      )}

      {/* MAIN BAR */}
      <div
        className={[
          "pointer-events-auto",
          "mx-auto",
          "w-[min(980px,calc(100%-24px))]",
          "rounded-2xl",
          "overflow-hidden",
          "mb-[max(12px,env(safe-area-inset-bottom))]",
          "transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          hidden ? "translate-y-[170%] pointer-events-none" : "translate-y-0",
        ].join(" ")}
      >
        {/* outer shell */}
        <div className="relative">
          {/* subtle animated accent line */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-70" />
          <div className="absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(120,160,255,0.22),transparent_60%)] blur-2xl" />

          {/* glass background */}
          <div className="bg-gradient-to-b from-black/35 via-black/55 to-black/70 backdrop-blur-2xl border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.7)]">
            {/* header row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/60 shadow-[0_0_18px_rgba(120,160,255,0.55)]" />
                <span className="text-[11px] tracking-[0.16em] text-white/70 uppercase">
                  Quick tools
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* collapse button */}

                <button
                  type="button"
                  onClick={() => setHidden(true)}
                  className={[
                    "relative overflow-hidden",
                    "rounded-full px-3.5 py-1.5",
                    "text-[12px] font-semibold tracking-wide",
                    "text-white/90 hover:text-white",
                    "border border-white/20",
                    "bg-gradient-to-b from-white/14 to-white/7 hover:from-white/18 hover:to-white/9",
                    "shadow-[0_10px_34px_rgba(0,0,0,0.55)]",
                    "ring-1 ring-white/15 hover:ring-white/25",
                    "transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]",
                    "animate-[toolsHidePulse_2.6s_ease-in-out_infinite]",
                  ].join(" ")}
                  aria-label="Hide tools"
                >
                  {/* subtle moving shine */}
                  <span
                    aria-hidden
                    className={[
                      "pointer-events-none absolute inset-0",
                      "bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.22)_35%,transparent_70%)]",
                      "translate-x-[-120%]",
                      "animate-[toolsHideShine_2.8s_ease-in-out_infinite]",
                    ].join(" ")}
                  />
                  {/* glow */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_28px_rgba(120,160,255,0.35)] opacity-70"
                  />
                  <span className="relative">Hide</span>
                </button>
              </div>
            </div>

            {/* tools grid */}
            <div className="px-3 pb-3">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {hasTools ? (
                  tools.map((tool) => <ToolButton key={tool.id} tool={tool} />)
                ) : (
                  <div className="text-sm text-white/70 py-3 px-2">
                    No tools configured
                  </div>
                )}
              </div>

              {/* footer hint line (optional) */}
              <div className="mt-3 px-1 text-[11px] text-white/40">
                Tip: collapse when reading to avoid distractions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ tool }: { tool: Tool }) {
  const base =
    "group relative w-full rounded-xl px-3 py-2.5 " +
    "border border-white/10 " +
    "bg-gradient-to-b from-white/8 to-white/4 " +
    "hover:from-white/12 hover:to-white/6 " +
    "active:from-white/10 active:to-white/5 " +
    "transition shadow-[0_10px_30px_rgba(0,0,0,0.35)]";

  const inner =
    "flex items-center justify-center gap-2 " +
    "text-[12px] text-white/85 " +
    "group-hover:text-white/95";

  const glow =
    "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition " +
    "shadow-[0_0_28px_rgba(120,160,255,0.18)]";

  const content = (
    <>
      <span className={glow} />
      <span className="relative flex items-center justify-center gap-2">
        {tool.icon ? <span className="text-white/80">{tool.icon}</span> : null}
        <span className="truncate">{tool.label}</span>
      </span>
    </>
  );

  if (tool.href) {
    return (
      <a href={tool.href} className={base}>
        <span className={inner}>{content}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={tool.onClick} className={base}>
      <span className={inner}>{content}</span>
    </button>
  );
}

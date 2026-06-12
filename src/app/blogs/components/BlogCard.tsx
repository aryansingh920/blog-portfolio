// components/BlogCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { BlogPost } from "../types";

type BlogCardProps = {
  post: BlogPost;
  isActive?: boolean;
};

type ShareStatus = "idle" | "shared" | "copied" | "failed";

export function BlogCard({ post, isActive = true }: BlogCardProps) {
  const hasImages = Boolean(post.imageMobile || post.imageDesktop);
  const tag = (post.tag ?? "").trim() || "All";

  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const timerRef = useRef<number | null>(null);
  const busy = shareStatus !== "idle";
  const cardRef = useRef<HTMLDivElement>(null);

  const url = useMemo(() => {
    if (typeof window === "undefined") return post.href;
    return `${window.location.origin}${post.href}`;
  }, [post.href]);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function flash(status: ShareStatus) {
    clearTimer();
    setShareStatus(status);
    timerRef.current = window.setTimeout(() => {
      setShareStatus("idle");
      timerRef.current = null;
    }, 1600);
  }

  useEffect(() => () => clearTimer(), []);

  async function handleShare() {
    const title = post.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        flash("shared");
        return;
      } catch {}
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        flash("copied");
        return;
      }
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      flash(ok ? "copied" : "failed");
    } catch {
      flash("failed");
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - left) / width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - top) / height) * 100}%`);
    el.style.setProperty("--spotlight-opacity", "1");
  }

  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--spotlight-opacity", "0");
  }

  const stagger = isActive
    ? { initial: true, animate: true }
    : { initial: false, animate: false };

  return (
    <div className="relative h-svh w-full">
      <div
        ref={cardRef}
        onMouseMove={isActive ? onMouseMove : undefined}
        onMouseLeave={isActive ? onMouseLeave : undefined}
        className="relative h-full w-full overflow-hidden rounded-[28px] bg-black"
        style={
          {
            "--mx": "50%",
            "--my": "50%",
            "--spotlight-opacity": "0",
          } as React.CSSProperties
        }
      >
        {/* Background image */}
        <div className="absolute inset-0">
          {hasImages ? (
            <picture>
              {post.imageDesktop && (
                <source media="(min-width: 768px)" srcSet={post.imageDesktop} />
              )}
              <img
                src={post.imageMobile || post.imageDesktop || ""}
                alt=""
                className="h-full w-full object-cover"
                style={{ opacity: 0.85, transform: "scale(1.04)" }}
                draggable={false}
                loading="lazy"
              />
            </picture>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-black" />
          )}

          {/* Cinematic gradient layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/20" />

          {/* Mouse spotlight */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              opacity: "var(--spotlight-opacity)",
              background:
                "radial-gradient(ellipse 55% 45% at var(--mx) var(--my), rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 40%, transparent 70%)",
            }}
          />
        </div>

        {/* Top gloss highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/8 to-transparent rounded-t-[28px]" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-10 pt-28">
          {/* Tag + read time */}
          <motion.div
            className="flex items-center gap-2"
            initial={stagger.initial ? { opacity: 0, y: 8 } : false}
            animate={stagger.animate ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {tag && (
              <Link
                data-no-swipe
                href={`/blogs?i=0&section=${encodeURIComponent(tag)}`}
                className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all duration-200 font-semibold tracking-widest uppercase text-[10px] text-white/90"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onPointerMoveCapture={(e) => e.stopPropagation()}
                onPointerUpCapture={(e) => e.stopPropagation()}
              >
                {tag}
              </Link>
            )}
            {post.readTime && (
              <>
                <span className="text-white/25 text-xs">·</span>
                <span className="text-white/50 text-xs font-medium">
                  {post.readTime}
                </span>
              </>
            )}
          </motion.div>

          <motion.h1
            className="mt-3 text-[1.65rem] font-bold leading-tight tracking-tight text-white"
            initial={stagger.initial ? { opacity: 0, y: 10 } : false}
            animate={stagger.animate ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.45, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {post.title}
          </motion.h1>

          {post.excerpt && (
            <motion.p
              className="mt-2.5 text-sm leading-relaxed text-white/65"
              initial={stagger.initial ? { opacity: 0, y: 8 } : false}
              animate={stagger.animate ? { opacity: 1, y: 0 } : undefined}
              transition={{
                duration: 0.45,
                delay: 0.13,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {post.excerpt}
            </motion.p>
          )}

          {/* Action buttons */}
          <motion.div
            className="mt-6 flex gap-2.5 items-center"
            data-no-swipe
            initial={stagger.initial ? { opacity: 0, y: 10 } : false}
            animate={stagger.animate ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onPointerMoveCapture={(e) => e.stopPropagation()}
            onPointerUpCapture={(e) => e.stopPropagation()}
          >
            <Link
              href={post.href}
              className="group inline-flex items-center gap-2 justify-center px-5 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-white/92 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-black/30"
            >
              Read Article
              <svg
                className="group-hover:translate-x-0.5 transition-transform duration-150"
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
              >
                <path
                  d="M2 6.5h9M7.5 2.5l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/12 hover:bg-white/20 backdrop-blur-sm border border-white/15 transition-all duration-150 font-semibold text-sm active:scale-[0.97] text-white"
              aria-busy={busy}
            >
              {shareStatus === "copied"
                ? "Copied ✓"
                : shareStatus === "shared"
                  ? "Shared ✓"
                  : shareStatus === "failed"
                    ? "Retry"
                    : "Share"}
            </button>
          </motion.div>

          <motion.div
            className="mt-4 flex items-center gap-1.5 text-[11px] text-white/25"
            initial={stagger.initial ? { opacity: 0 } : false}
            animate={stagger.animate ? { opacity: 1 } : undefined}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span>↑↓ navigate</span>
            <span className="opacity-50">·</span>
            <span>← → also works</span>
          </motion.div>
        </div>

        {/* Edge vignette for depth */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.25)] rounded-[28px]" />
        {/* Ring */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/10" />
      </div>
    </div>
  );
}

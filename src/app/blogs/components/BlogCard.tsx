// components/BlogCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BlogPost } from "../types";

type BlogCardProps = {
  post: BlogPost;
};

type ShareStatus = "idle" | "shared" | "copied" | "failed";

export function BlogCard({ post }: BlogCardProps) {
  const hasImages = Boolean(post.imageMobile || post.imageDesktop);
  const tag = (post.tag ?? "").trim() || "All";

  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const timerRef = useRef<number | null>(null);
  const busy = shareStatus !== "idle";

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

  useEffect(() => {
    return () => clearTimer();
  }, []);

  async function handleShare() {
    const title = post.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        flash("shared");
        return;
      } catch {
        // fallback to copy
      }
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

  return (
    <div className="relative h-svh w-full">
      <div className="relative h-full w-full overflow-hidden rounded-[28px] ring-1 ring-white/10 bg-black">
        {/* Background */}
        <div className="absolute inset-0">
          {hasImages ? (
            <picture>
              {post.imageDesktop && (
                <source media="(min-width: 768px)" srcSet={post.imageDesktop} />
              )}
              <img
                src={post.imageMobile || post.imageDesktop || ""}
                alt=""
                className="h-full w-full object-cover opacity-75"
                draggable={false}
                loading="lazy"
              />
            </picture>
          ) : (
            <div className="h-full w-full bg-linear-to-b from-zinc-900 to-black" />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-black/25 via-black/55 to-black/85" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-8 pt-28">
          <div className="flex items-center gap-2 text-xs opacity-90">
            {tag && (
              <Link
                data-no-swipe
                href={`/blogs?i=0&section=${encodeURIComponent(tag)}`}
                className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 transition"
                onPointerDownCapture={(e) => e.stopPropagation()}
                onPointerMoveCapture={(e) => e.stopPropagation()}
                onPointerUpCapture={(e) => e.stopPropagation()}
              >
                {tag}
              </Link>
            )}
            {post.readTime && (
              <>
                <span className="opacity-60">•</span>
                <span className="opacity-75">{post.readTime}</span>
              </>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              {post.excerpt}
            </p>
          )}

          {/* Actions */}
          <div
            className="mt-5 flex gap-2 items-center"
            data-no-swipe
            onPointerDownCapture={(e) => e.stopPropagation()}
            onPointerMoveCapture={(e) => e.stopPropagation()}
            onPointerUpCapture={(e) => e.stopPropagation()}
          >
            <Link
              href={post.href}
              className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-black font-semibold"
            >
              Open (Read)
            </Link>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 transition font-semibold"
              aria-busy={busy}
            >
              {shareStatus === "copied"
                ? "Copied"
                : shareStatus === "shared"
                  ? "Shared"
                  : shareStatus === "failed"
                    ? "Retry"
                    : "Share"}
            </button>
          </div>

          <div className="mt-6 text-xs opacity-60">
            Swipe up for next • Swipe down for previous
          </div>
        </div>
      </div>
    </div>
  );
}

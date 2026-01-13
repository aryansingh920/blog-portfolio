"use client";

import Link from "next/link";
import type { BlogPost } from "../types";

type BlogCardProps = {
  post: BlogPost;
};

export function BlogCard({ post }: BlogCardProps) {
  const hasImages = Boolean(post.imageMobile || post.imageDesktop);
  const tag = (post.tag ?? "").trim() || "All";

  return (
    <div className="relative h-svh w-full ">
      {/* Card shell */}
      <div className="relative h-full w-full overflow-hidden rounded-[28px] ring-1 ring-white/10 bg-black">
        {/* Background */}
        <div className="absolute inset-0">
          {hasImages ? (
            <picture>
              {/* Desktop */}
              {post.imageDesktop ? (
                <source media="(min-width: 768px)" srcSet={post.imageDesktop} />
              ) : null}

              {/* Mobile fallback */}
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

          {/* Darken for text readability */}
          <div className="absolute inset-0 bg-linear-to-b from-black/25 via-black/55 to-black/85" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-8 pt-28">
          <div className="flex items-center gap-2 text-xs opacity-90">
            {tag ? (
              <Link
                href={`/blogs?i=0&section=${encodeURIComponent(tag)}`}
                className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 transition"
              >
                {tag}
              </Link>
            ) : null}

            {post.readTime ? (
              <>
                <span className="opacity-60">•</span>
                <span className="opacity-75">{post.readTime}</span>
              </>
            ) : null}
          </div>

          <h1 className="mt-3 text-2xl font-semibold leading-tight">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <Link
              href={post.href}
              className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-black font-semibold"
            >
              Open (Read)
            </Link>

            <button className="px-4 py-3 rounded-2xl bg-white/10">Save</button>

            <button
              className="px-4 py-3 rounded-2xl bg-white/10"
              onClick={() => {
                const url = `${window.location.origin}${post.href}`;
                navigator
                  .share?.({ title: post.title, url })
                  .catch(() => void navigator.clipboard?.writeText(url));
              }}
            >
              Share
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

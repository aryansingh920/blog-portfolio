// app/blogs/components/BlogCard.tsx
"use client";

import Link from "next/link";
import type { BlogPost } from "../types";

type BlogCardProps = {
  post: BlogPost;
};

export function BlogCard({ post }: BlogCardProps) {
  return (
    <div className="relative h-svh w-full">
      {/* Background */}
      <div className="absolute inset-0">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            className="h-full w-full object-cover opacity-65"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-linear-to-b from-zinc-900 to-black" />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/55 to-black/85" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end px-5 pb-8 pt-28">
        <div className="flex items-center gap-2 text-xs opacity-85">
          <span className="px-2 py-1 rounded-full bg-white/10">{post.tag}</span>
          <span className="opacity-70">•</span>
          <span className="opacity-70">{post.readTime}</span>
        </div>

        <h1 className="mt-3 text-2xl font-semibold leading-tight">
          {post.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed opacity-80">
          {post.excerpt}
        </p>

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
  );
}

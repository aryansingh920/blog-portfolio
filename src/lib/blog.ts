// lib/blog.ts
import "server-only";
import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";

export type BlogIndexItem = {
  id: number;
  slug: string;
  title: string;
  section?: string;
  date: string; // YYYY-MM-DD
  author: string;

  dir: string;
  html: string;
  imageMobile: string;
  imageDesktop: string;

  excerpt?: string;
};


const CONTENT_ROOT = path.join(process.cwd(), "content");

export const getBlogIndex = cache(async (): Promise<BlogIndexItem[]> => {
  const p = path.join(CONTENT_ROOT, "blog-index.json");
  const raw = await fs.readFile(p, "utf8");
  const data = JSON.parse(raw) as BlogIndexItem[];

  // Sort newest first (stable baseline)
  data.sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id
  );
  return data;
});

// Deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(s: string) {
  // simple stable hash for seed
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyShuffled<T>(items: T[], dayKey: string): T[] {
  const arr = items.slice();
  const rand = mulberry32(hashSeed(dayKey));

  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const getPostHtmlBySlug = cache(
  async (slug: string): Promise<string | null> => {
    const index = await getBlogIndex();
    const found = index.find((p) => p.slug === slug);
    if (!found) return null;

    const p = path.join(CONTENT_ROOT, found.html);
    return fs.readFile(p, "utf8");
  }
);


export const getPostHtmlById = cache(
  async (id: number): Promise<string | null> => {
    const index = await getBlogIndex();
    const found = index.find((p) => p.id === id);
    if (!found) return null;

    const p = path.join(CONTENT_ROOT, found.html);
    return fs.readFile(p, "utf8");
  }
);


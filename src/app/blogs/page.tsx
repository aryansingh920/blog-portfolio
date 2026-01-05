/* eslint-disable @typescript-eslint/no-explicit-any */
// // app/blogs/page.tsx
// "use client";

// import { SwipeFeed } from "./components/SwipeFeed";
// import { demoPosts } from "./data";

// export default function BlogsPage() {
//   return <SwipeFeed posts={demoPosts} />;
// }


// app/blogs/page.tsx
import { getBlogIndex, dailyShuffled } from "@/lib/blog";
import { SwipeFeed } from "./components/SwipeFeed";

export const revalidate = 3600; // cache page for 1 hour (change as you like)

function dayKeyUTC() {
  // daily stable; if you want Dublin-local, use Europe/Dublin offset logic
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function BlogsPage() {
  const index = await getBlogIndex();

  const shuffled = dailyShuffled(index, dayKeyUTC());

  // Only send the fields your cards need (keep payload small)
  const posts = shuffled.map((p) => ({
    id: String(p.id),
    title: p.title,
    href: `/blogs/read?id=${p.id}&name=${encodeURIComponent(p.slug)}`,
    author: p.author,
    date: p.date,
    section: p.section ?? "",
    excerpt: p.excerpt ?? "",
    imageMobile: p.imageMobile,
    imageDesktop: p.imageDesktop,
  }));


  return <SwipeFeed posts={posts as any} />;
}

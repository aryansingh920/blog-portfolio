import { getBlogIndex, dailyShuffled, getPostHtmlById } from "@/lib/blog";
import { SwipeFeed } from "./components/SwipeFeed";
import type { BlogPost } from "./types";

export const revalidate = 3600;

function dayKeyUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function estimateReadTimeFromHtml(html: string, wpm = 200) {
  const text = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = text ? text.split(" ").length : 0;
  const mins = Math.max(1, Math.ceil(words / wpm));
  return `${mins} min`;
}

type BlogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const sp = await searchParams;

  const index = await getBlogIndex();
  const shuffled = dailyShuffled(index, dayKeyUTC());

  const rawI = sp.i;
  const iStr = Array.isArray(rawI) ? rawI[0] : rawI;
  const parsed = Number(iStr);
  const initialIndex = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

  // compute readTime from actual HTML (server-side)
  const posts: BlogPost[] = await Promise.all(
    shuffled.map(async (p, idx) => {
      const html = (await getPostHtmlById(p.id)) ?? "";
      const readTime = html ? estimateReadTimeFromHtml(html) : "1 min";

      return {
        id: String(p.id),
        title: p.title,
        excerpt: p.excerpt ?? "",
        tag: (p.section ?? "").trim() || "Blog",
        readTime,
        // include i so reader can move next/prev in same daily order
        href: `/blogs/read?id=${p.id}&name=${encodeURIComponent(
          p.slug
        )}&i=${idx}`,
        imageMobile: p.imageMobile ?? "",
        imageDesktop: p.imageDesktop ?? "",
      };
    })
  );

  return <SwipeFeed posts={posts} initialIndex={initialIndex} />;
}

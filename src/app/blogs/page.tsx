import { getBlogIndex, dailyShuffled } from "@/lib/blog";
import { SwipeFeed } from "./components/SwipeFeed";
import type { BlogPost } from "./types";

export const revalidate = 3600; // cache page for 1 hour

function dayKeyUTC() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type BlogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const sp = await searchParams;

  const index = await getBlogIndex();
  const shuffled = dailyShuffled(index, dayKeyUTC());

  const posts: BlogPost[] = shuffled.map((p) => {
    // reasonable defaults to satisfy BlogPost type
    const tag = (p.section ?? "").trim() || "Blog";
    const readTime = "5 min";

    return {
      id: String(p.id),
      title: p.title,
      excerpt: p.excerpt ?? "",
      tag,
      readTime,
      href: `/blogs/read?id=${p.id}&name=${encodeURIComponent(p.slug)}`,
      imageMobile: p.imageMobile ?? "",
      imageDesktop: p.imageDesktop ?? "",
    };
  });

  // read initial index from URL: /blogs?i=3
  const rawI = sp.i;
  const iStr = Array.isArray(rawI) ? rawI[0] : rawI;
  const parsed = Number(iStr);
  const initialIndex = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

  return <SwipeFeed posts={posts} initialIndex={initialIndex} />;
}

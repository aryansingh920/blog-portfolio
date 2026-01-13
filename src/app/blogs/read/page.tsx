import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogIndex, getPostHtmlById, dailyShuffled } from "@/lib/blog";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import styles from "./ReadPage.module.css";
import SwipeReaderNav from "./SwipeReaderNav";
import ReaderMotionShell from "./ReaderMotionShell";
import ReaderOnboardingOverlay from "./ReaderOnboardingOverlay";

export const revalidate = 86400;

type ReadPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function ReadPage({ searchParams }: ReadPageProps) {
  const sp = await searchParams;

  const id = Number(Array.isArray(sp.id) ? sp.id[0] : sp.id);
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";
  const iRaw = Array.isArray(sp.i) ? sp.i[0] : sp.i;
  const dirRaw = Array.isArray(sp.dir) ? sp.dir[0] : sp.dir;

  const i = Number(iRaw);
  const initialI = Number.isFinite(i) ? i : 0;
  const dir: "next" | "prev" = dirRaw === "prev" ? "prev" : "next";

  if (!Number.isFinite(id) || id <= 0) return notFound();

  const index = await getBlogIndex();
  const shuffled = dailyShuffled(index, dayKeyUTC());

  const post = index.find((p) => p.id === id);
  if (!post || (name && post.slug !== name)) return notFound();

  const html = await getPostHtmlById(id);
  if (!html) return notFound();

  const readTime = estimateReadTimeFromHtml(html);

  const order = shuffled.map((p) => ({ id: p.id, slug: p.slug }));
  const sectionLabel = (post.section ?? "").trim() || "All";

  return (
    <div className={styles.spaceBg}>
      <div className={styles.starsLayer}>
        <ShootingStars />
        <StarsBackground />
      </div>

      {/* reader onboarding overlay */}
      <ReaderOnboardingOverlay />

      <SwipeReaderNav order={order} initialIndex={initialI} />

      {/* Card-like transition wrapper */}
      <ReaderMotionShell motionKey={String(id)} dir={dir}>
        <div className={styles.contentLayer}>
          <div className="relative h-[40vh] w-full overflow-hidden rounded-b-3xl">
            <picture className="absolute inset-0">
              {post.imageDesktop && (
                <source media="(min-width: 768px)" srcSet={post.imageDesktop} />
              )}
              <img
                src={post.imageMobile || post.imageDesktop || ""}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            </picture>

            <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

            <div className="relative z-20 flex h-full flex-col justify-end p-6 md:p-10">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href="/blogs?i=0"
                  className="font-medium text-blue-400 hover:text-blue-300 transition"
                >
                  All
                </Link>

                <span className="text-gray-500">/</span>

                <Link
                  href={`/blogs?i=0&section=${encodeURIComponent(
                    sectionLabel
                  )}`}
                  className="font-medium text-blue-400 hover:text-blue-300 transition"
                >
                  {sectionLabel}
                </Link>
              </p>

              
              
              <h1 className="text-3xl text-white font-bold tracking-tight md:text-5xl">
                {post.title}
              </h1>

              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                <span>{post.author}</span>
                <span>•</span>
                <span>{post.date}</span>
                <span>•</span>
                <span>{readTime}</span>
              </div>
            </div>
          </div>

          <article className="prose prose-invert prose-zinc mx-auto px-6 py-12">
            <div
              className={`${styles.articleHtml} [&>p]:mb-6 [&>h2]:mb-4 [&>h2]:mt-10 [&>h2]:text-2xl [&>h2]:font-bold`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        </div>
      </ReaderMotionShell>
    </div>
  );
}

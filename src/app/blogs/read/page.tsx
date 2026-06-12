import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogIndex, getPostHtmlById, dailyShuffled } from "@/lib/blog";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";
import styles from "./ReadPage.module.css";
import SwipeReaderNav from "./SwipeReaderNav";
import ReaderMotionShell from "./ReaderMotionShell";
import ReaderOnboardingOverlay from "./ReaderOnboardingOverlay";
import ReadingProgressBar from "./ReadingProgressBar";
import ArticleReveal from "./ArticleReveal";
import TTSFloatingPlayer from "./TTSFloatingPlayer";

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
      <ReadingProgressBar />

      <div className={styles.starsLayer}>
        <ShootingStars />
        <StarsBackground />
      </div>

      {/* reader onboarding overlay */}
      <ReaderOnboardingOverlay />

      <SwipeReaderNav order={order} initialIndex={initialI} />

      {/* Card-like transition wrapper */}
      <ReaderMotionShell motionKey={String(id)} dir={dir}>
        <div className={styles.contentLayer} data-scroll-container>
          <div className="relative h-[42vh] w-full overflow-hidden rounded-b-3xl">
            <picture className="absolute inset-0">
              {post.imageDesktop && (
                <source media="(min-width: 768px)" srcSet={post.imageDesktop} />
              )}
              <img
                src={post.imageMobile || post.imageDesktop || ""}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: 0.55, transform: "scale(1.04)" }}
              />
            </picture>

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/10" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-transparent to-transparent" />

            <div className="relative z-20 flex h-full flex-col justify-end p-6 md:p-10">
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href="/blogs?i=0"
                  className="font-medium text-indigo-400 hover:text-indigo-300 transition"
                >
                  All
                </Link>
                <span className="text-gray-600">/</span>
                <Link
                  href={`/blogs?i=0&section=${encodeURIComponent(sectionLabel)}`}
                  className="font-medium text-indigo-400 hover:text-indigo-300 transition"
                >
                  {sectionLabel}
                </Link>
              </p>

              <h1 className="mt-2 text-3xl text-white font-bold tracking-tight md:text-5xl leading-tight">
                {post.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">{post.author}</span>
                <span className="text-zinc-600">·</span>
                <span>{post.date}</span>
                <span className="text-zinc-600">·</span>
                <span className="px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-xs font-medium text-zinc-300">
                  {readTime} read
                </span>
              </div>
            </div>
          </div>

          <article className="prose prose-invert prose-zinc mx-auto px-6 py-12">
            <ArticleReveal>
              <div
                id="blog-article-text"
                className={`${styles.articleHtml} [&>p]:mb-6 [&>h2]:mb-4 [&>h2]:mt-10 [&>h2]:text-2xl [&>h2]:font-bold`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </ArticleReveal>
          </article>
        </div>
      </ReaderMotionShell>

      {/* Floating TTS player — only visible while audio is playing */}
      <TTSFloatingPlayer
        targetId="blog-article-text"
        motionKey={String(id)}
        title={post.title}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getBlogIndex, getPostHtmlById } from "@/lib/blog";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

export const revalidate = 86400;

type ReadPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReadPage({ searchParams }: ReadPageProps) {
  const sp = await searchParams;
  const id = Number(Array.isArray(sp.id) ? sp.id[0] : sp.id);
  const name = (Array.isArray(sp.name) ? sp.name[0] : sp.name) ?? "";

  if (!Number.isFinite(id) || id <= 0) return notFound();

  const index = await getBlogIndex();
  const post = index.find((p) => p.id === id);
  if (!post || (name && post.slug !== name)) return notFound();

  const html = await getPostHtmlById(id);
  if (!html) return notFound();

  return (
    <BackgroundBeamsWithCollision className="relative w-screen h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Full-viewport scroller */}
      <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden">
        {/* Hero Section */}
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
            <span className="mb-2 font-medium text-blue-400">
              {post.section}
            </span>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <span>{post.author}</span>
              <span>•</span>
              <span>{post.date}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <article className="prose prose-invert prose-zinc mx-auto  px-6 py-12">
          <div
            dangerouslySetInnerHTML={{ __html: html }}
            className="[&>p]:mb-6 [&>h2]:mb-4 [&>h2]:mt-10 [&>h2]:text-2xl [&>h2]:font-bold"
          />
        </article>
      </div>
    </BackgroundBeamsWithCollision>
  );
}

// src/app/blogs/[slug]/page.tsx
import { getBlogIndex, getPostHtmlBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";

export const revalidate = 86400;

export async function generateStaticParams() {
  const index = await getBlogIndex();
  return index.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const html = await getPostHtmlBySlug(slug);
  if (!html) return notFound();

  return (
    <article className="prose prose-invert max-w-none px-4 py-10">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

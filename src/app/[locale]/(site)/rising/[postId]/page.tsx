import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { RisingPostLikeButton } from "@/components/rising/RisingPostLikeButton";

const SOURCE_LABELS: Record<string, string> = {
  deviantart: "DeviantArt",
  discord: "Discord",
  site: "StyleGuideAI",
};

const TOOL_LABELS: Record<string, string> = {
  stylebear: "StyleBear",
  styletarot: "StyleTarot",
  styledice: "StyleDice",
  museum: "Virtual Museum",
};

async function getPost(postId: string) {
  const [post] = await db
    .select()
    .from(risingPosts)
    .where(eq(risingPosts.id, postId))
    .limit(1)
    .catch(() => []);
  return post ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) return { title: "Not Found | StyleGuideAI" };

  const title = post.title
    ? `${post.title} by ${post.creatorName}`
    : `Art by ${post.creatorName}`;

  return {
    title: `${title} | StyleGuideAI Rising`,
    description:
      post.caption ??
      `Community art by ${post.creatorName} on StyleGuideAI Rising — ${SOURCE_LABELS[post.source] ?? post.source}`,
    openGraph: {
      title,
      images: [{ url: post.imageUrl, alt: title }],
    },
    twitter: { card: "summary_large_image", images: [post.imageUrl] },
    robots: { index: true, follow: true },
  };
}

export default async function RisingPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = await getPost(postId);
  if (!post) notFound();

  const totalLikes = (post.siteLikes ?? 0) + (post.rawEngagement ?? 0);
  const isExpired = new Date(post.expiresAt) < new Date();
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const hoursLeft = isExpired ? 0 : Math.round((new Date(post.expiresAt).getTime() - nowMs) / 3_600_000);

  return (
    <main className="min-h-screen bg-stone-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/rising"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-colors mb-6"
        >
          ← Back to Rising
        </Link>

        <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
          {/* Image */}
          <div className="rounded-2xl overflow-hidden bg-stone-900">
            <img
              src={post.imageUrl}
              alt={post.title ?? `Art by ${post.creatorName}`}
              className="w-full h-auto object-contain max-h-[70vh]"
            />
          </div>

          {/* Info panel */}
          <div className="space-y-5">
            {post.title && (
              <h1 className="font-heading text-2xl text-white leading-snug">
                {post.title}
              </h1>
            )}

            <div className="space-y-1">
              <p className="text-white/50 text-xs uppercase tracking-widest">Creator</p>
              {post.creatorUrl ? (
                <a
                  href={post.creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-medium hover:text-[oklch(0.65_0.22_285)] transition-colors"
                >
                  {post.creatorName}
                </a>
              ) : (
                <p className="text-white font-medium">{post.creatorName}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-white/50 text-xs uppercase tracking-widest">Source</p>
              <p className="text-white/80 text-sm">
                {SOURCE_LABELS[post.source] ?? post.source}
                {post.toolOrigin && ` · via ${TOOL_LABELS[post.toolOrigin] ?? post.toolOrigin}`}
              </p>
            </div>

            {post.caption && (
              <div className="space-y-1">
                <p className="text-white/50 text-xs uppercase tracking-widest">Caption</p>
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.caption}
                </p>
              </div>
            )}

            {/* Like button */}
            <RisingPostLikeButton postId={post.id} initialLikes={totalLikes} />

            {/* Status */}
            <p className="text-white/40 text-xs">
              {isExpired
                ? "This post has expired from the Rising feed."
                : `${hoursLeft}h remaining in Rising`}
            </p>

            {/* View original */}
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:border-white/40 text-sm transition-colors"
              >
                View on {SOURCE_LABELS[post.source] ?? post.source} ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

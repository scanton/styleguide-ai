import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { risingPosts } from "@/drizzle/schema";
import { gt, lt, and, sql, eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";

async function getTopRising() {
  return db
    .select({
      id: risingPosts.id,
      imageUrl: risingPosts.imageUrl,
      title: risingPosts.title,
      creatorName: risingPosts.creatorName,
      siteLikes: risingPosts.siteLikes,
      rawEngagement: risingPosts.rawEngagement,
    })
    .from(risingPosts)
    .where(and(gt(risingPosts.expiresAt, new Date()), eq(risingPosts.hidden, false)))
    .orderBy(
      sql`(${risingPosts.rawEngagement} + ${risingPosts.siteLikes})::float /
          POWER(EXTRACT(EPOCH FROM (NOW() - ${risingPosts.createdAt})) / 3600.0 + 2, 1.5) DESC`
    )
    .limit(5)
    .catch(() => []);
}

async function getTopOfWeek() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return db
    .select({
      id: risingPosts.id,
      imageUrl: risingPosts.imageUrl,
      title: risingPosts.title,
      creatorName: risingPosts.creatorName,
      siteLikes: risingPosts.siteLikes,
      rawEngagement: risingPosts.rawEngagement,
    })
    .from(risingPosts)
    .where(
      and(
        eq(risingPosts.hidden, false),
        gt(risingPosts.createdAt, weekAgo),
        lt(risingPosts.expiresAt, new Date()) // already expired = past the 24h window
      )
    )
    .orderBy(
      sql`(${risingPosts.rawEngagement} + ${risingPosts.siteLikes}) DESC`
    )
    .limit(5)
    .catch(() => []);
}

function ImageStrip({
  posts,
  heading,
  subheading,
  linkHref,
  linkLabel,
}: {
  posts: Awaited<ReturnType<typeof getTopRising>>;
  heading: string;
  subheading: string;
  linkHref: string;
  linkLabel: string;
}) {
  if (!posts.length) return null;
  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-purple-400 font-semibold mb-0.5">
            {subheading}
          </p>
          <h2 className="font-heading text-xl md:text-2xl text-white">{heading}</h2>
        </div>
        <Link
          href={linkHref}
          className="text-sm text-white/50 hover:text-white/90 transition-colors shrink-0"
        >
          {linkLabel} →
        </Link>
      </div>

      {/* Mobile: horizontal scroll — Desktop: 5-col grid */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/rising/${post.id}`}
            className="flex-none w-40 md:w-auto aspect-square relative overflow-hidden rounded-xl bg-stone-800 group block"
          >
            <img
              src={post.imageUrl}
              alt={post.title ?? `Art by ${post.creatorName}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
              <p className="text-white text-[11px] font-medium truncate">{post.creatorName}</p>
              <p className="text-white/60 text-[10px] tabular-nums">
                ♥ {(post.siteLikes ?? 0) + (post.rawEngagement ?? 0)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function RisingWidget() {
  const [rising, topOfWeek, t] = await Promise.all([
    getTopRising(),
    getTopOfWeek(),
    getTranslations("home"),
  ]);

  if (!rising.length && !topOfWeek.length) return null;

  return (
    <section className="bg-stone-950 py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-10">
        {rising.length > 0 && (
          <ImageStrip
            posts={rising}
            heading={t("risingHeading")}
            subheading={t("risingSubheading")}
            linkHref="/rising"
            linkLabel={t("risingSeeAll")}
          />
        )}
        {topOfWeek.length > 0 && (
          <ImageStrip
            posts={topOfWeek}
            heading={t("risingTopOfWeek")}
            subheading={t("risingTopOfWeekSub")}
            linkHref="/rising"
            linkLabel={t("risingViewGallery")}
          />
        )}
      </div>
    </section>
  );
}

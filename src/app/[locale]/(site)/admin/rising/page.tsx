import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { risingPosts, risingReports } from "@/drizzle/schema";
import { eq, sql, getTableColumns } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const ADMIN_EMAIL = "satoricanton@gmail.com";

async function getReportedPosts() {
  return db
    .select({
      ...getTableColumns(risingPosts),
      reportCount: sql<number>`count(${risingReports.reporterId})::int`,
    })
    .from(risingPosts)
    .innerJoin(risingReports, eq(risingReports.postId, risingPosts.id))
    .groupBy(risingPosts.id)
    .orderBy(sql`count(${risingReports.reporterId}) DESC`);
}

type ReportedPost = Awaited<ReturnType<typeof getReportedPosts>>[number];

// ─── Server Actions ──────────────────────────────────────────────────────────

async function deletePost(postId: string) {
  "use server";
  await db.delete(risingPosts).where(eq(risingPosts.id, postId));
  revalidatePath("/admin/rising");
}

async function hidePost(postId: string) {
  "use server";
  await db
    .update(risingPosts)
    .set({ hidden: true })
    .where(eq(risingPosts.id, postId));
  revalidatePath("/admin/rising");
}

async function unhidePost(postId: string) {
  "use server";
  await db
    .update(risingPosts)
    .set({ hidden: false })
    .where(eq(risingPosts.id, postId));
  revalidatePath("/admin/rising");
}

async function dismissReports(postId: string) {
  "use server";
  await db
    .delete(risingReports)
    .where(eq(risingReports.postId, postId));
  revalidatePath("/admin/rising");
}

// ─── Row component ────────────────────────────────────────────────────────────

function PostRow({ post }: { post: ReportedPost }) {
  const deleteWithId = deletePost.bind(null, post.id);
  const hideWithId = hidePost.bind(null, post.id);
  const unhideWithId = unhidePost.bind(null, post.id);
  const dismissWithId = dismissReports.bind(null, post.id);

  return (
    <tr className={`border-b border-stone-800 ${post.hidden ? "opacity-50" : ""}`}>
      {/* Thumbnail */}
      <td className="py-3 pr-4 w-16">
        <img
          src={post.thumbnailUrl ?? post.imageUrl}
          alt=""
          className="w-14 h-14 object-cover rounded-lg bg-stone-800"
        />
      </td>

      {/* Info */}
      <td className="py-3 pr-4">
        <p className="text-white text-sm font-medium">{post.creatorName}</p>
        <p className="text-stone-500 text-xs capitalize">{post.source}</p>
        {post.caption && (
          <p className="text-stone-400 text-xs mt-0.5 line-clamp-2 max-w-xs">
            {post.caption}
          </p>
        )}
        {post.hidden && (
          <span className="text-xs text-amber-500 font-medium">Hidden</span>
        )}
      </td>

      {/* Report count */}
      <td className="py-3 pr-6 text-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-900/40 text-red-300 text-sm font-bold">
          {post.reportCount}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Dismiss reports — keep post, clear reports */}
          <form action={dismissWithId}>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors"
            >
              Dismiss
            </button>
          </form>

          {/* Hide / Unhide */}
          {post.hidden ? (
            <form action={unhideWithId}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-md bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 transition-colors"
              >
                Unhide
              </button>
            </form>
          ) : (
            <form action={hideWithId}>
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-md bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 transition-colors"
              >
                Hide
              </button>
            </form>
          )}

          {/* Delete — permanent */}
          <form action={deleteWithId}>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-md bg-red-900/50 hover:bg-red-800/60 text-red-200 transition-colors"
              onClick={(e) => {
                if (!confirm("Permanently delete this post?")) e.preventDefault();
              }}
            >
              Delete
            </button>
          </form>

          {/* View original */}
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            >
              View ↗
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminRisingPage() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const reported = await getReportedPosts();

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-2">
            Admin
          </p>
          <h1 className="text-3xl font-bold text-white">Rising Moderation</h1>
          <p className="text-stone-400 text-sm mt-1">
            {reported.length} post{reported.length !== 1 ? "s" : ""} with reports
          </p>
        </div>

        {reported.length === 0 ? (
          <div className="text-stone-500 text-sm py-16 text-center">
            No reported posts — the community is behaving. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-700 text-left">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Image
                  </th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Post
                  </th>
                  <th className="pb-3 pr-6 text-xs font-semibold uppercase tracking-wider text-stone-500 text-center">
                    Reports
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {reported.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

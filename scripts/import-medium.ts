/**
 * One-time import of Medium data export into the articles table.
 * Usage: npm run db:import-medium
 *
 * Reads every published HTML file from .planning/medium-export/posts/,
 * parses title / summary / date / canonical URL / first image,
 * matches movement names, and upserts into the articles table.
 */

import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { articles, artMovements } from "../src/drizzle/schema";

const POSTS_DIR = path.join(process.cwd(), ".planning", "medium-export", "posts");

// ─── HTML parsers ─────────────────────────────────────────────────────────────

function extractTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return (m?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
}

function extractAttr(html: string, selector: string, attr: string): string {
  // selector e.g. 'class="p-canonical"'
  const re = new RegExp(`<a[^>]+${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]+href=["']([^"']+)["']`, "i");
  const m = html.match(re) ?? html.match(new RegExp(`href=["']([^"']+)["'][^>]*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  return (m?.[1] ?? "").trim();
}

function extractDatetime(html: string): string | null {
  const m = html.match(/<time[^>]+class="dt-published"[^>]+datetime="([^"]+)"/i)
    ?? html.match(/<time[^>]+datetime="([^"]+)"[^>]+class="dt-published"/i);
  return m?.[1] ?? null;
}

function extractFeaturedImage(html: string): string | null {
  // Prefer data-is-featured="true" image
  const featured = html.match(/<img[^>]+data-is-featured="true"[^>]+src="([^"]+)"/i)
    ?? html.match(/<img[^>]+src="([^"]+)"[^>]+data-is-featured="true"/i);
  if (featured) return featured[1];

  // Fall back to first graf-image
  const first = html.match(/<img[^>]+class="graf-image"[^>]+src="([^"]+)"/i)
    ?? html.match(/<img[^>]+src="([^"]+)"[^>]+class="graf-image"/i);
  return first?.[1] ?? null;
}

function slugFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop()?.slice(0, 200) ?? "";
  } catch {
    return url.slice(-40);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error("Posts directory not found:", POSTS_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".html") && !f.startsWith("draft_"));
  console.log(`Found ${files.length} published HTML files`);

  // Load all art movements once for matching
  const movements = await db.select({ id: artMovements.id, name: artMovements.name }).from(artMovements);
  const movementNames = movements.map((mv) => ({ id: mv.id, lower: mv.name.toLowerCase() }));
  console.log(`Loaded ${movements.length} art movements for matching`);

  let synced = 0;
  let skipped = 0;

  for (const file of files) {
    const html = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");

    const title = extractTag(html, "title");
    const summary = (() => {
      const m = html.match(/<section[^>]+data-field="subtitle"[^>]*>([\s\S]*?)<\/section>/i);
      return (m?.[1] ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 500) || null;
    })();
    const datetimeStr = extractDatetime(html);
    const canonicalUrl = extractAttr(html, 'class="p-canonical"', "href");
    const thumbnailUrl = extractFeaturedImage(html);

    if (!title || !canonicalUrl) {
      console.warn(`  Skipping ${file} — missing title or canonical URL`);
      skipped++;
      continue;
    }

    const slug = slugFromUrl(canonicalUrl);
    const publishedAt = datetimeStr ? new Date(datetimeStr) : null;

    // Movement matching: title + summary
    const lowerTitle = title.toLowerCase();
    const lowerSummary = (summary ?? "").toLowerCase();
    const movementMatches = movementNames
      .filter((mv) => lowerTitle.includes(mv.lower) || lowerSummary.includes(mv.lower))
      .map((mv) => mv.id);

    try {
      // Use slug as conflict target — RSS may have stored the same article with
      // tracking query params in mediumUrl, giving a different mediumUrl but the
      // same derived slug. The export gives us the clean canonical URL.
      await db
        .insert(articles)
        .values({
          title,
          slug,
          summary,
          mediumUrl: canonicalUrl,
          publishedAt,
          tags: [],          // tags not in export HTML; RSS sync fills them for recent posts
          thumbnailUrl,
          movementMatches,
        })
        .onConflictDoUpdate({
          target: articles.slug,
          set: {
            title,
            summary,
            mediumUrl: canonicalUrl,   // upgrade to clean canonical URL
            thumbnailUrl,
            movementMatches,
            updatedAt: new Date(),
          },
        });
      synced++;
      if (synced % 25 === 0) console.log(`  ${synced}/${files.length} imported…`);
    } catch (err) {
      console.error(`  Error importing ${file}:`, err);
      skipped++;
    }
  }

  console.log(`\nDone. Imported: ${synced} | Skipped: ${skipped} | Total files: ${files.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

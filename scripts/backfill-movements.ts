/**
 * Backfills movement_matches on every article by scanning titles and HTML content
 * against the 38 art movements in the DB.
 *
 * Usage: npm run db:backfill-movements
 *
 * Also reports art-movement topics found in article titles that have no matching
 * museum timeline entry — these should be added as TODOs in .planning/todo.md.
 */

import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { articles, artMovements } from "../src/drizzle/schema";
import { eq } from "drizzle-orm";

const POSTS_DIR = path.join(process.cwd(), ".planning", "medium-export", "posts");

// Adjective/derived forms that don't match the movement name itself but refer to it
const ADJECTIVE_FORMS: Record<string, string[]> = {
  impressionism: ["impressionist", "impressionists"],
  surrealism: ["surrealist", "surrealists"],
  cubism: ["cubist", "cubists"],
  expressionism: ["expressionist", "expressionists"],
  romanticism: ["romanticist", "romanticists"],
  futurism: ["futurist", "futurists"],
  fauvism: ["fauvist", "fauvists"],
  symbolism: ["symbolist", "symbolists"],
  minimalism: ["minimalist", "minimalists"],
  dada: ["dadaism", "dadaist", "dadaists"],
  realism: ["realist", "realists"],
  mannerism: ["mannerist", "mannerists"],
  baroque: ["baroco"],
  neoclassicism: ["neoclassical", "neoclassicist", "neo-classical"],
  "abstract-expressionism": ["abstract expressionist", "abstract expressionists"],
  "post-impressionism": ["post-impressionist", "post impressionist", "post-impressionists"],
  "pointillism": ["pointillist", "pointillists", "divisionism", "divisionist"],
  "photorealism": ["photorealist", "photorealists", "hyper-realism", "hyperrealism"],
  "land-art": ["earth art", "earthwork", "earthworks", "land artwork"],
  "stuckism": ["stuckist", "stuckists"],
  "art-nouveau": ["art nouveau"],
  "art-deco": ["art deco"],
  "pop-art": ["pop art"],
  "street-art": ["street art"],
  "ancient-greek": ["ancient greek"],
  "ancient-egyptian": ["ancient egyptian"],
  "early-renaissance": ["early renaissance"],
  "high-renaissance": ["high renaissance"],
  "northern-renaissance": ["northern renaissance"],
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

async function main() {
  const dbMovements = await db
    .select({ id: artMovements.id, name: artMovements.name })
    .from(artMovements);
  console.log(`Loaded ${dbMovements.length} movements`);

  const dbArticles = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      movementMatches: articles.movementMatches,
    })
    .from(articles);
  console.log(`Loaded ${dbArticles.length} articles`);

  // Index HTML files by hash (last hex segment of filename)
  const htmlByHash = new Map<string, string>();
  if (fs.existsSync(POSTS_DIR)) {
    const files = fs.readdirSync(POSTS_DIR);
    for (const fname of files) {
      if (fname.startsWith("draft_") || !fname.endsWith(".html")) continue;
      const base = fname.replace(/\.html$/, "");
      const segments = base.split(/[-_]/);
      const hash = segments[segments.length - 1].toLowerCase();
      if (/^[0-9a-f]{8,}$/i.test(hash)) {
        try {
          const raw = fs.readFileSync(path.join(POSTS_DIR, fname), "utf-8");
          htmlByHash.set(hash, stripHtml(raw).slice(0, 6000));
        } catch {
          // skip unreadable files
        }
      }
    }
  }
  console.log(`Indexed ${htmlByHash.size} HTML files\n`);

  let updated = 0;
  let unchanged = 0;

  for (const art of dbArticles) {
    // Extract hash from slug (last hyphen-separated segment)
    const slugParts = art.slug.split("-");
    const hash = slugParts[slugParts.length - 1].toLowerCase();
    const htmlContent = htmlByHash.get(hash) ?? "";

    // Double the title so title matches outweigh body noise
    const searchText = `${art.title} ${art.title} ${htmlContent}`;

    const matched = new Set<string>();

    for (const mv of dbMovements) {
      if (matchesPhrase(searchText, mv.name)) {
        matched.add(mv.id);
        continue;
      }
      const adjectives = ADJECTIVE_FORMS[mv.id] ?? [];
      if (adjectives.some((adj) => matchesPhrase(searchText, adj))) {
        matched.add(mv.id);
      }
    }

    const newMatches = Array.from(matched).sort();
    const existingMatches = [...(art.movementMatches ?? [])].sort();

    if (newMatches.join(",") !== existingMatches.join(",")) {
      await db
        .update(articles)
        .set({ movementMatches: newMatches, updatedAt: new Date() })
        .where(eq(articles.id, art.id));
      updated++;
      if (newMatches.length > 0) {
        console.log(`  ✓  "${art.title}"`);
        console.log(`      → [${newMatches.join(", ")}]`);
      } else {
        console.log(`  –  "${art.title}" (cleared)`);
      }
    } else {
      unchanged++;
    }
  }

  console.log(`\nDone. Updated: ${updated}  Unchanged: ${unchanged}\n`);

  // ─── Gap analysis: art topics in article titles not in our museum ─────────
  const unknownTermsToCheck = [
    "stuckism",
    "stuckist",
    "constructivism",
    "constructivist",
    "de stijl",
    "art brut",
    "op art",
    "land art",
    "conceptual art",
    "performance art",
    "fluxus",
    "vorticism",
    "vorticist",
    "precisionism",
    "ashcan school",
    "hudson river school",
    "tonalism",
    "tonalist",
    "luminism",
    "luminist",
    "orientalism",
    "orientalist",
    "japonisme",
    "aesthetic movement",
    "arts and crafts",
    "new objectivity",
    "magic realism",
    "social realism",
    "photorealism",
    "photorealist",
    "hyperrealism",
    "hyperrealist",
    "neo-expressionism",
    "pointillism",
    "pointillist",
    "cloisonnism",
    "synthetism",
    "divisionism",
    "pre-raphaelite",
    "bauhaus",
    "suprematism",
    "suprematist",
    "futurism",
  ];

  // Build set of terms already covered (movement names + adjective forms)
  const coveredTerms = new Set(
    dbMovements.flatMap((m) => {
      const adjs = ADJECTIVE_FORMS[m.id] ?? [];
      // Include both the movement name and the ID (normalized with spaces) so
      // IDs like "pre-raphaelite" don't show as gaps when the name is "Pre-Raphaelite Brotherhood"
      return [m.name.toLowerCase(), m.id.replace(/-/g, " "), ...adjs];
    })
  );

  const missing = new Map<string, string>(); // term → example article title

  for (const term of unknownTermsToCheck) {
    if (coveredTerms.has(term.toLowerCase())) continue;
    for (const art of dbArticles) {
      if (art.title.toLowerCase().includes(term.toLowerCase())) {
        missing.set(term, art.title);
        break;
      }
    }
  }

  if (missing.size > 0) {
    console.log("Art topics in article titles NOT in museum timeline:");
    for (const [term, example] of missing) {
      console.log(`  - "${term}"  (e.g., "${example}")`);
    }
  } else {
    console.log("No gaps found — all article art topics are in the museum timeline.");
  }
}

main().catch(console.error);

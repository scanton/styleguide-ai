/* Diagnose Rising/DeviantArt sync: inspect DB state and live DA API responses. */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync("/Users/scanton/Documents/GitHub/styleguide-ai/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const DA_BASE = "https://www.deviantart.com/api/v1/oauth2";
const DA_TOKEN_URL = "https://www.deviantart.com/oauth2/token";
const GROUP_NAME = "styleguideai";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== DB: active deviantart rising posts (expires_at > now) ===");
  const active = await sql`
    SELECT title, creator_name, created_at, expires_at,
           ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 3600) AS hours_left
    FROM rising_posts
    WHERE source = 'deviantart' AND expires_at > NOW()
    ORDER BY expires_at DESC
  `;
  for (const r of active) {
    console.log(`  ${String(r.hours_left).padStart(5)}h left | created ${new Date(r.created_at as string).toISOString()} | ${r.title} — ${r.creator_name}`);
  }
  console.log(`  total active: ${active.length}`);

  console.log("\n=== DB: recently expired deviantart posts (last 48h) ===");
  const expired = await sql`
    SELECT title, creator_name, created_at, expires_at
    FROM rising_posts
    WHERE source = 'deviantart' AND expires_at <= NOW() AND expires_at > NOW() - INTERVAL '48 hours'
    ORDER BY expires_at DESC
    LIMIT 40
  `;
  for (const r of expired) {
    console.log(`  expired ${new Date(r.expires_at as string).toISOString()} | created ${new Date(r.created_at as string).toISOString()} | ${r.title} — ${r.creator_name}`);
  }

  // --- DeviantArt live check ---
  const tokenRes = await fetch(DA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.DEVIANTART_CLIENT_ID!,
      client_secret: process.env.DEVIANTART_CLIENT_SECRET!,
    }),
  });
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const authHeaders = { Authorization: `Bearer ${access_token}` };

  const foldersRes = await fetch(
    `${DA_BASE}/gallery/folders?${new URLSearchParams({ username: GROUP_NAME, calculate_size: "false", limit: "50" })}`,
    { headers: authHeaders }
  );
  const foldersData = (await foldersRes.json()) as { results: { folderid: string; name: string }[] };
  console.log("\n=== DA: folder order as returned by API ===");
  foldersData.results.forEach((f, i) => console.log(`  [${i}] ${f.name} (${f.folderid})`));

  const featured = foldersData.results.find((f) => f.name.toLowerCase() === "featured");
  const themeFolders = foldersData.results.filter((f) => f.name.toLowerCase() !== "featured").slice(0, 2);
  const targets = [featured, ...themeFolders].filter(Boolean) as { folderid: string; name: string }[];

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const folder of targets) {
    console.log(`\n=== DA: gallery "${folder.name}" (mode=newest, limit=24) ===`);
    const res = await fetch(
      `${DA_BASE}/gallery/${folder.folderid}?${new URLSearchParams({ username: GROUP_NAME, limit: "24", mode: "newest" })}`,
      { headers: authHeaders }
    );
    if (!res.ok) {
      console.log(`  FETCH FAILED: ${res.status} ${await res.text()}`);
      continue;
    }
    const data = (await res.json()) as {
      results: { deviationid: string; title: string; published_time: number; author: { username: string }; preview: unknown }[];
      has_more: boolean;
    };
    for (const d of data.results ?? []) {
      const pub = new Date(Number(d.published_time) * 1000);
      const inWindow = pub.getTime() >= cutoff ? "IN 24h WINDOW" : "too old";
      console.log(`  ${pub.toISOString()} [${inWindow}] ${d.title} — ${d.author?.username} ${d.preview ? "" : "(NO PREVIEW)"}`);
    }
    console.log(`  count: ${data.results?.length ?? 0}, has_more: ${data.has_more}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

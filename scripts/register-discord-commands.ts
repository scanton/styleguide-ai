/**
 * Registers the /stylebear slash command with Discord.
 *
 * Run with:
 *   npx tsx scripts/register-discord-commands.ts          # guild (instant)
 *   npx tsx scripts/register-discord-commands.ts --global # global (up to 1h propagation)
 *
 * Guild commands appear instantly in the server specified by DISCORD_GUILD_ID.
 * Global commands eventually propagate to every server the bot is in.
 * Register guild first to test, then global when ready to ship.
 *
 * Safe to re-run — Discord upserts by name, no duplicates.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const isGlobal = process.argv.includes("--global");

if (!APP_ID || !BOT_TOKEN) {
  console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in .env.local");
  process.exit(1);
}
if (!isGlobal && !GUILD_ID) {
  console.error("Missing DISCORD_GUILD_ID in .env.local (required for guild registration)");
  console.error("Add it or use --global to register globally instead.");
  process.exit(1);
}

const commands = [
  {
    name: "stylebear",
    // No parameters — the bot opens a modal form instead.
    // Fields (scene, movement, media, style) are collected via the form.
    description: "Generate an AI art prompt — a form will appear to fill in your ideas",
  },
];

async function main() {
  const url = isGlobal
    ? `https://discord.com/api/v10/applications/${APP_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;

  console.log(isGlobal ? "Registering globally…" : `Registering to guild ${GUILD_ID}…`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`✅ Registered ${(data as unknown[]).length} command(s):`);
    for (const cmd of data as { name: string; id: string }[]) {
      console.log(`   /${cmd.name}  (id: ${cmd.id})`);
    }
  } else {
    const error = await res.text();
    console.error(`❌ Registration failed (${res.status}):`, error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

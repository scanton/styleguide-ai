/**
 * One-time script to register the /stylebear slash command with Discord.
 *
 * Run with:
 *   npx tsx scripts/register-discord-commands.ts
 *
 * Requires DISCORD_BOT_TOKEN and DISCORD_APP_ID in .env.local
 * (or set them inline as shell env vars).
 *
 * Safe to re-run — Discord upserts commands by name, so re-registering
 * only updates the definition, it doesn't create duplicates.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const APP_ID = process.env.DISCORD_APP_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error("Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN in .env.local");
  process.exit(1);
}

const commands = [
  {
    name: "stylebear",
    description: "Generate an AI art prompt with StyleBear",
    options: [
      {
        name: "movement",
        description: "Art movement (e.g. Impressionism, Bauhaus, Surrealism)",
        type: 3, // STRING
        required: false,
      },
      {
        name: "media",
        description: "Media type (e.g. Watercolor, Oil Painting, Digital Art)",
        type: 3, // STRING
        required: false,
      },
      {
        name: "scene",
        description: "Subject or scene description (freeform)",
        type: 3, // STRING
        required: false,
      },
      {
        name: "style",
        description: "Prompt style format",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "Modern / Detailed (default)", value: "modern" },
          { name: "Flux", value: "flux" },
          { name: "Midjourney", value: "midjourney" },
          { name: "SDXL / SD1.5", value: "sdxl" },
          { name: "Tag (Pony / Illustrious)", value: "tag" },
        ],
      },
      {
        name: "aspect",
        description: "Aspect ratio",
        type: 3, // STRING
        required: false,
        choices: [
          { name: "16:9 (Landscape)", value: "16:9" },
          { name: "1:1 (Square)", value: "1:1" },
          { name: "9:16 (Portrait)", value: "9:16" },
          { name: "4:3", value: "4:3" },
          { name: "3:2", value: "3:2" },
          { name: "2:3", value: "2:3" },
        ],
      },
      {
        name: "share",
        description: "Post publicly to the channel (default: only you can see it)",
        type: 5, // BOOLEAN
        required: false,
      },
    ],
  },
];

async function main() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

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

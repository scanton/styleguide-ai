import { NextResponse } from "next/server";
import { getArtists, getMovements } from "@/lib/museum-data";

const LLM_URL = process.env.OPENROUTER_API_KEY
  ? "https://openrouter.ai/api/v1/chat/completions"
  : null;

async function callLLM(systemMessage: string, userMessage: string): Promise<string> {
  if (!LLM_URL || !process.env.OPENROUTER_API_KEY) {
    throw new Error("LLM not configured");
  }
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://styleguideai.com",
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_tokens: 400,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { type, id, sceneDetails, aspectRatio } = body as {
    type: "artist" | "movement";
    id: string;
    sceneDetails?: string;
    aspectRatio?: string;
  };

  if (!type || !id) {
    return NextResponse.json({ error: "type and id are required" }, { status: 422 });
  }

  let systemMessage: string;
  let userMessage: string;

  if (type === "artist") {
    const artists = getArtists();
    const artist = artists.find((a) => a.id === id);
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const movementsLabel = artist.movements.join(", ") || "mixed movements";
    const yearsLabel = artist.deathYear
      ? `${artist.birthYear}–${artist.deathYear}`
      : `born ${artist.birthYear}`;

    systemMessage = `You are an expert AI art prompt engineer. Generate a richly detailed, imaginative art prompt inspired by the style of a specific artist. Your prompt should evoke their signature aesthetic: their medium, technique, color palette, subject matter, mood, and compositional choices. Make the scene vivid and specific — invent a compelling subject that feels true to this artist's world. Return ONLY the prompt itself — no preamble, no explanation, no labels, no quotation marks. Output 120–220 words of pure visual description.`;

    const artistAspectSuffix = aspectRatio ? `\n\nEnd the prompt with: ${aspectRatio} aspect ratio` : "";
    userMessage = `Generate an AI art prompt in the style of ${artist.name} (${yearsLabel}), associated with ${movementsLabel}.

About this artist: ${artist.description}${sceneDetails ? `\n\nSpecific scene details to incorporate: ${sceneDetails}` : ""}

Create a prompt that captures ${artist.name}'s distinctive visual language — their typical subjects, color sensibility, technique, and emotional register.${artistAspectSuffix}`;
  } else {
    const movements = getMovements();
    const movement = movements.find((m) => m.id === id);
    if (!movement) {
      return NextResponse.json({ error: "Movement not found" }, { status: 404 });
    }

    const endLabel = movement.endYear ? String(movement.endYear) : "present";
    const yearsLabel = `${movement.startYear}–${endLabel}`;

    systemMessage = `You are an expert AI art prompt engineer. Generate a richly detailed, imaginative art prompt in the style of a specific art movement. Your prompt should evoke the movement's defining aesthetic: its typical media, techniques, color palettes, subject matter, mood, and compositional philosophy. Invent a compelling, specific scene that feels authentically rooted in that movement. Return ONLY the prompt itself — no preamble, no explanation, no labels, no quotation marks. Output 120–220 words of pure visual description.`;

    const movementAspectSuffix = aspectRatio ? `\n\nEnd the prompt with: ${aspectRatio} aspect ratio` : "";
    userMessage = `Generate an AI art prompt in the style of the ${movement.name} art movement (${yearsLabel}).

About this movement: ${movement.description}${sceneDetails ? `\n\nSpecific scene details to incorporate: ${sceneDetails}` : ""}

Create a prompt that authentically captures the ${movement.name} aesthetic — its characteristic techniques, color sensibility, subject matter, and emotional tone.${movementAspectSuffix}`;
  }

  try {
    const prompt = await callLLM(systemMessage, userMessage);
    if (!prompt) {
      return NextResponse.json({ error: "No content from LLM" }, { status: 502 });
    }
    return NextResponse.json({ prompt });
  } catch (err) {
    console.error("Museum generate-prompt error:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

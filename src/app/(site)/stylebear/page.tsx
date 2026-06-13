import type { Metadata } from "next";
import StyleBearClient from "@/components/stylebear/StyleBearClient";

export const metadata: Metadata = {
  title: "StyleBear — AI Art Prompt Generator",
  description:
    "Generate rich AI art prompts using art movements, media types, and cultural influences. StyleBear by StyleGuideAI.",
  openGraph: {
    title: "StyleBear — AI Art Prompt Generator",
    description: "Generate rich AI art prompts using art movements, media types, and cultural influences. StyleBear by StyleGuideAI.",
    images: [{ url: "/images/og/og-stylebear.png", width: 1672, height: 941, alt: "StyleBear — AI Art Prompt Generator" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-stylebear.png"] },
};

export default function StyleBearPage() {
  return <StyleBearClient />;
}

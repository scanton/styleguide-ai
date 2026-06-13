import type { Metadata } from "next";
import StyleBearClient from "@/components/stylebear/StyleBearClient";

export const metadata: Metadata = {
  title: "StyleBear — AI Art Prompt Generator",
  description:
    "Generate rich AI art prompts using art movements, media types, and cultural influences. StyleBear by StyleGuideAI.",
};

export default function StyleBearPage() {
  return <StyleBearClient />;
}

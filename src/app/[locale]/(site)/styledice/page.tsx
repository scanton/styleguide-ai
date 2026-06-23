import type { Metadata } from "next";
import StyleDiceClient from "@/components/styledice/StyleDiceClient";

export const metadata: Metadata = {
  title: "StyleDice — Art Inspiration Game",
  description:
    "Roll six creative dice — art movements, famous artists, media types, techniques, pop culture, and genres — then generate a ready-to-use AI art prompt.",
  openGraph: {
    title: "StyleDice — Art Inspiration Game",
    description: "Roll six creative dice — art movements, famous artists, media types, techniques, pop culture, and genres — then generate a ready-to-use AI art prompt.",
    images: [{ url: "/images/og/og-styledice.png", width: 1672, height: 941, alt: "StyleDice — Art Inspiration Game" }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og/og-styledice.png"] },
};

export default function StyleDicePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            🎲 StyleDice
          </h1>
          <p className="mt-2 text-foreground/50 text-sm uppercase tracking-widest font-semibold">
            Art Inspiration Game
          </p>
        </div>
        <StyleDiceClient />
      </div>
    </main>
  );
}

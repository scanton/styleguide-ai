import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Placeholder } from "@/components/ui/placeholder";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center gap-8">
      {/* StyleBear mascot */}
      <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden border-2 border-primary/20 bg-card shadow-xl">
        <Placeholder
          width={192}
          height={192}
          alt="[PROMPT: cute white plush fluffy chibi-style teddy bear with meerkat-like eyes, looking confused and adorable, holding a vintage map upside-down, retro 1950s style, warm pastel colors, soft illustration style]"
          className="w-full h-full"
        />
      </div>

      {/* Copy */}
      <div className="space-y-3 max-w-md">
        <div className="font-heading text-7xl font-bold text-primary/20" aria-hidden="true">
          404
        </div>
        <h1 className="font-heading text-2xl font-bold">
          Oops! StyleBear got lost.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          This page doesn&apos;t exist (or maybe it moved). StyleBear checked twice. He&apos;s very thorough.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="min-h-[44px]">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-[44px]">
          <Link href="/stylebear">Try StyleBear</Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="min-h-[44px]">
          <Link href="/museum">Virtual Museum</Link>
        </Button>
      </div>

      {/* Retro decoration */}
      <p className="text-xs text-muted-foreground font-mono">
        Error 404 · Page not found · StyleGuideAI
      </p>
    </div>
  );
}

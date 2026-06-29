import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Placeholder } from "@/components/ui/placeholder";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description:
      "StyleGuideAI is a 1,000+ member AI art community led by Satori Canton. Join us on Discord and DeviantArt.",
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 md:py-24 space-y-16">
      {/* Intro */}
      <section aria-labelledby="about-heading" className="space-y-6 text-center">
        <h1
          id="about-heading"
          className="font-heading text-4xl font-bold sm:text-5xl"
        >
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t("intro")}
        </p>
      </section>

      {/* Community */}
      <section aria-labelledby="community-heading" className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-5">
          <h2 id="community-heading" className="font-heading text-2xl font-bold">
            {t("communityHeading")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("communityDesc1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("communityDesc2")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="default" size="lg" className="min-h-[44px]">
              <a
                href="https://discord.gg/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("joinDiscord")}
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-[44px]">
              <a
                href="https://www.deviantart.com/styleguideai"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("deviantartGroup")}
              </a>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border">
          <Image
            src="/images/about-community.png"
            alt="StyleGuideAI community members — illustrated as a white bear, owl, wolf, squirrel, ghost, and other characters — painting and sketching together in a warm art studio"
            width={480}
            height={360}
            className="w-full"
          />
        </div>
      </section>

      {/* Founder */}
      <section aria-labelledby="founder-heading" className="rounded-2xl bg-card border border-border p-8 md:p-12 grid gap-8 md:grid-cols-3 md:items-start">
        <div className="md:col-span-1 flex justify-center">
          <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-primary/20">
            <Image
              src="/images/satori-avatar.webp"
              alt="Satori Canton"
              width={160}
              height={160}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 id="founder-heading" className="font-heading text-2xl font-bold">
            {t("satorHeading")}
          </h2>
          <p className="text-sm text-primary font-medium">{t("satorRole")}</p>
          <p className="text-muted-foreground leading-relaxed">
            {t("satorDesc1")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("satorDesc2")}
          </p>
          <div className="flex gap-3 pt-2">
            <Button asChild variant="outline" size="sm">
              <a
                href="https://medium.com/@satoricanton"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("readOnMedium")}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

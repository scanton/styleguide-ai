import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HistoryClient } from "@/components/account/HistoryClient";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "history" });
  return {
    title: t("pageTitle"),
    description: t("pageSubtitle"),
  };
}

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "history" });
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("pageTitle")}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t("pageSubtitle")}</p>
        </div>
        <HistoryClient />
      </div>
    </main>
  );
}
